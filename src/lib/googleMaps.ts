import axios from 'axios'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export interface DistanceResult {
  distance: number // in kilometers
  duration: number // in minutes
  route?: string
  directionsUrl?: string
}

export interface Location {
  latitude: number
  longitude: number
}

/**
 * Generate a Google Maps directions URL for navigation
 */
export function generateDirectionsUrl(
  origin: Location,
  destination: Location
): string {
  const baseUrl = 'https://www.google.com/maps/dir/'
  const originParam = `${origin.latitude},${origin.longitude}`
  const destinationParam = `${destination.latitude},${destination.longitude}`

  return `${baseUrl}${originParam}/${destinationParam}`
}

export async function calculateDistance(
  origin: Location,
  destination: Location
): Promise<DistanceResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured')
  }

  try {
    console.log(`Calculating distance from ${origin.latitude},${origin.longitude} to ${destination.latitude},${destination.longitude}`)

    const body = {
      origins: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude
              }
            }
          }
        }
      ],
      destinations: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude
              }
            }
          }
        }
      ],
      travelMode: "DRIVE"
    }

    const response = await axios.post(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
        }
      }
    )

    console.log('Routes API response:', JSON.stringify(response.data, null, 2))

    const routes = response.data

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      console.log('No routes in response')
      return null
    }

    const route = routes[0]

    if (route.condition !== 'ROUTE_EXISTS' || !route.distanceMeters || !route.duration) {
      console.log('Route condition:', route.condition)
      return null
    }

    // Extract seconds from duration string (e.g., "160s" -> 160)
    const durationSeconds = parseInt(route.duration.replace('s', ''))

    // Generate directions URL
    const directionsUrl = generateDirectionsUrl(origin, destination)

    const result = {
      distance: Math.round(route.distanceMeters / 1000 * 100) / 100, // Convert meters to km, round to 2 decimals
      duration: Math.round(durationSeconds / 60), // Convert seconds to minutes
      route: JSON.stringify(route),
      directionsUrl
    }

    console.log('Distance calculation successful:', result)
    return result
  } catch (error) {
    console.error('Error calculating distance:', error)
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Error response:', error.response.data)
    }
    return null
  }
}

export async function geocodeAddress(address: string): Promise<Location | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured')
  }

  try {
    console.log(`Attempting to geocode: ${address}`)
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY,
          region: 'in', // Bias results towards India
        },
      }
    )

    console.log(`Geocoding API response status: ${response.data.status}`)
    console.log(`Results count: ${response.data.results?.length || 0}`)

    const result = response.data?.results?.[0]

    if (!result) {
      console.log('No geocoding results found')
      return null
    }

    const location = {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    }

    console.log(`Geocoding successful: ${location.latitude}, ${location.longitude}`)
    return location
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

// Enhanced geocoding function with multiple fallback strategies
export async function geocodeAddressWithFallbacks(
  name: string,
  pincode?: string | null,
  address?: string | null
): Promise<Location | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured')
  }

  // Strategy 1: Full address with all details - {name}, {address}, {pincode}, Tamil Nadu, India
  if (pincode && address) {
    const fullAddress = `${name}, ${address}, ${pincode}, Tamil Nadu, India`
    console.log(`Strategy 1 - Full address: ${fullAddress}`)
    const result = await geocodeAddress(fullAddress)
    if (result) return result
  }

  // Strategy 2: Name + pincode + Tamil Nadu - {name}, {pincode}, Tamil Nadu, India
  if (pincode) {
    const pincodeAddress = `${name}, ${pincode}, Tamil Nadu, India`
    console.log(`Strategy 2 - Name + pincode: ${pincodeAddress}`)
    const result = await geocodeAddress(pincodeAddress)
    if (result) return result
  }

  // Strategy 3: Just pincode + Tamil Nadu - {pincode}, Tamil Nadu, India
  if (pincode) {
    const justPincode = `${pincode}, Tamil Nadu, India`
    console.log(`Strategy 3 - Just pincode: ${justPincode}`)
    const result = await geocodeAddress(justPincode)
    if (result) return result
  }

  // Strategy 4: Name + address + Tamil Nadu (without pincode) - {name}, {address}, Tamil Nadu, India
  if (address) {
    const nameAddress = `${name}, ${address}, Tamil Nadu, India`
    console.log(`Strategy 4 - Name + address: ${nameAddress}`)
    const result = await geocodeAddress(nameAddress)
    if (result) return result
  }

  // Strategy 5: Just name + Tamil Nadu - {name}, Tamil Nadu, India
  const justName = `${name}, Tamil Nadu, India`
  console.log(`Strategy 5 - Just name: ${justName}`)
  const result = await geocodeAddress(justName)
  if (result) return result

  console.log('All geocoding strategies failed')
  return null
}

export async function batchCalculateDistances(
  origins: Location[],
  destinations: Location[]
): Promise<(DistanceResult | null)[][]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured')
  }

  const maxOriginsPerRequest = 10
  const maxDestinationsPerRequest = 25
  const results: (DistanceResult | null)[][] = []

  for (let i = 0; i < origins.length; i += maxOriginsPerRequest) {
    const originBatch = origins.slice(i, i + maxOriginsPerRequest)
    const batchResults: (DistanceResult | null)[][] = []

    for (let j = 0; j < destinations.length; j += maxDestinationsPerRequest) {
      const destinationBatch = destinations.slice(j, j + maxDestinationsPerRequest)

      try {
        const response = await axios.get(
          'https://maps.googleapis.com/maps/api/distancematrix/json',
          {
            params: {
              origins: originBatch.map(o => `${o.latitude},${o.longitude}`).join('|'),
              destinations: destinationBatch.map(d => `${d.latitude},${d.longitude}`).join('|'),
              mode: 'driving',
              units: 'metric',
              key: GOOGLE_MAPS_API_KEY,
            },
          }
        )

        const rows = response.data?.rows || []

        for (let k = 0; k < rows.length; k++) {
          if (!batchResults[k]) batchResults[k] = []

          const elements = rows[k]?.elements || []
          for (const element of elements) {
            if (element.status === 'OK') {
              batchResults[k].push({
                distance: Math.round(element.distance.value / 1000 * 100) / 100,
                duration: Math.round(element.duration.value / 60),
                route: JSON.stringify(element)
              })
            } else {
              batchResults[k].push(null)
            }
          }
        }

        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error('Error in batch distance calculation:', error)
        // Fill with null values for failed requests
        for (let k = 0; k < originBatch.length; k++) {
          if (!batchResults[k]) batchResults[k] = []
          for (let l = 0; l < destinationBatch.length; l++) {
            batchResults[k].push(null)
          }
        }
      }
    }

    results.push(...batchResults)
  }

  return results
}
