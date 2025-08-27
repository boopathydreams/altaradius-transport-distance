import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { calculateDistance, geocodeAddressWithFallbacks, batchCalculateDistances } from '@/lib/googleMaps'

// Configuration for production optimization
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const BATCH_SIZE_LIMIT = IS_PRODUCTION ? 25 : 100 // Smaller batches in production
const FALLBACK_LIMIT = IS_PRODUCTION ? 5 : 10 // Even smaller fallback in production
const BATCH_TIMEOUT = IS_PRODUCTION ? 30000 : 60000 // 30s in production, 60s in dev

// Type definitions
type DistanceCreateInput = {
  sourceId: number
  destinationId: number
  distance: number
  duration?: number
  route?: string
  directionsUrl?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('sourceId')
    const destinationId = searchParams.get('destinationId')
    const calculate = searchParams.get('calculate') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10000') // Increased default limit to show all distances

    // New filtering parameters
    const sourceFilter = searchParams.get('sourceFilter') || ''
    const destinationFilter = searchParams.get('destinationFilter') || ''

    // Scenario 3: Both source and destination specified
    if (sourceId && destinationId) {
      return await calculateSingleDistance(parseInt(sourceId), parseInt(destinationId))
    }

    // Scenario 1: Only source specified - get distances to all destinations
    if (sourceId) {
      return await calculateDistancesFromSource(parseInt(sourceId))
    }

    // Scenario 2: Only destination specified - get distances from all sources
    if (destinationId) {
      return await calculateDistancesToDestination(parseInt(destinationId))
    }

    // Scenario 4: No parameters
    if (calculate) {
      // Only calculate missing distances if explicitly requested
      return await calculateAllDistances()
    } else {
      // Default: Return existing distances with pagination (fast)
      return await getExistingDistances(page, limit, sourceFilter, destinationFilter)
    }
  } catch (error) {
    console.error('Error in distances API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fast function to get existing distances without calculation
async function getExistingDistances(page: number = 1, limit: number = 1000, sourceFilter: string = '', destinationFilter: string = '') { // Back to safe limit
  console.log(`Fetching existing distances - Page: ${page}, Limit: ${limit}, Source filter: "${sourceFilter}", Destination filter: "${destinationFilter}"`)

  const skip = (page - 1) * limit

  try {
    // Build filter conditions for Prisma where clause
    const whereClause: {
      source?: {
        name: {
          contains: string
          mode: 'insensitive'
        }
      }
      destination?: {
        name: {
          contains: string
          mode: 'insensitive'
        }
      }
    } = {}

    // Add source name filtering
    if (sourceFilter) {
      whereClause.source = {
        name: {
          contains: sourceFilter,
          mode: 'insensitive' // Case-insensitive search
        }
      }
    }

    // Add destination name filtering
    if (destinationFilter) {
      whereClause.destination = {
        name: {
          contains: destinationFilter,
          mode: 'insensitive' // Case-insensitive search
        }
      }
    }

    // Get total count with filters applied
    const totalCount = await prisma.distance.count({
      where: whereClause
    })
    console.log(`Total distances in DB (filtered): ${totalCount}, requesting ${limit} starting from ${skip}`)

    // Get existing distances with filtering applied
    const distances = await prisma.distance.findMany({
      where: whereClause,
      skip,
      take: limit,
      select: {
        id: true,
        sourceId: true,
        destinationId: true,
        distance: true,
        duration: true,
        directionsUrl: true,
        createdAt: true,
        // Exclude large fields like 'route' to reduce size but keep directionsUrl and createdAt
        source: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            address: true
          }
        },
        destination: {
          select: {
            id: true,
            name: true,
            pincode: true,
            address: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: [
        { source: { name: 'asc' } },
        { destination: { name: 'asc' } }
      ]
    })

    console.log(`Found ${distances.length} existing distances`)

    return NextResponse.json({
      distances,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasMore: skip + distances.length < totalCount
      }
    })
  } catch (error) {
    console.error('Error fetching existing distances:', error)
    return NextResponse.json(
      { error: 'Error fetching distances', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

async function calculateSingleDistance(sourceId: number, destinationId: number) {
  // Check if distance is already cached
  const distance = await prisma.distance.findUnique({
    where: {
      sourceId_destinationId: {
        sourceId,
        destinationId,
      },
    },
    include: {
      source: true,
      destination: true,
    },
  })

  if (distance) {
    return NextResponse.json([distance])
  }

  // Get source and destination
  const source = await prisma.source.findUnique({ where: { id: sourceId } })
  let destination = await prisma.destination.findUnique({ where: { id: destinationId } })

  if (!source || !destination) {
    return NextResponse.json(
      { error: 'Source or destination not found' },
      { status: 404 }
    )
  }

  // If destination doesn't have coordinates, try to geocode it
  if (!destination.latitude || !destination.longitude) {
    console.log(`Attempting to geocode destination "${destination.name}"`)

    const location = await geocodeAddressWithFallbacks(
      destination.name,
      destination.pincode,
      destination.address
    )

    if (location) {
      console.log(`Successfully geocoded "${destination.name}": ${location.latitude}, ${location.longitude}`)

      // Update destination with coordinates
      destination = await prisma.destination.update({
        where: { id: destinationId },
        data: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      })
    } else {
      console.log(`Failed to geocode destination: ${destination.name}`)
      return NextResponse.json(
        { error: `Could not geocode destination "${destination.name}". Please add coordinates manually.` },
        { status: 422 }
      )
    }
  }

  // Calculate distance using Google Maps API
  console.log(`About to calculate distance between source ${source.id} and destination ${destination.id}`)

  const result = await calculateDistance(
    { latitude: source.latitude, longitude: source.longitude },
    { latitude: destination.latitude!, longitude: destination.longitude! }
  )

  if (!result) {
    console.log('Distance calculation returned null')
    return NextResponse.json(
      { error: 'Could not calculate distance' },
      { status: 500 }
    )
  }

  console.log('Distance calculation succeeded, caching result')

  // Cache the result
  const distanceData: DistanceCreateInput = {
    sourceId,
    destinationId,
    distance: result.distance,
    duration: result.duration,
    route: result.route,
    ...(result.directionsUrl && { directionsUrl: result.directionsUrl }),
  }

  const newDistance = await prisma.distance.create({
    data: distanceData,
    include: {
      source: true,
      destination: true,
    },
  })

  return NextResponse.json([newDistance])
}

async function calculateDistancesFromSource(sourceId: number) {
  const startTime = Date.now()
  const timeLimit = IS_PRODUCTION ? 25000 : 55000 // 25s in production, 55s in dev (leave 5s buffer)

  const source = await prisma.source.findUnique({ where: { id: sourceId } })
  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  // Early timeout check
  if (Date.now() - startTime > timeLimit) {
    console.warn(`Early timeout detected for source ${source.name}`)
    return NextResponse.json({
      error: 'Request timeout - please try with filters to reduce dataset size',
      timeout: true
    }, { status: 408 })
  }

  const destinations = await prisma.destination.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { name: 'asc' }
  })

  // Fetch all existing distances for this source at once (PERFORMANCE FIX)
  const existingDistances = await prisma.distance.findMany({
    where: {
      sourceId: sourceId,
      destinationId: { in: destinations.map((d: { id: number }) => d.id) }
    },
    include: {
      source: true,
      destination: true,
    },
  })

  // Create a lookup map for existing distances
  const existingDistanceMap = new Map<number, typeof existingDistances[0]>()
  existingDistances.forEach((distance: { destinationId: number }) => {
    existingDistanceMap.set(distance.destinationId, distance as typeof existingDistances[0])
  })

  // Separate destinations into existing and missing
  const missingDestinations = destinations.filter((d: { id: number }) => !existingDistanceMap.has(d.id))
  const results = [...existingDistances] // Start with all existing distances

  console.log(`Source ${source.name}: ${existingDistances.length} existing, ${missingDestinations.length} missing distances`)

  // Use batch calculation for missing distances to prevent timeout
  if (missingDestinations.length > 0) {
    const origins = [{ latitude: source.latitude, longitude: source.longitude }]

    // Limit batch size for production
    const batchSize = Math.min(BATCH_SIZE_LIMIT, missingDestinations.length)
    const destinationsToProcess = missingDestinations.slice(0, batchSize)
    const destinationLocations = destinationsToProcess.map((d: { latitude: number; longitude: number }) => ({
      latitude: d.latitude,
      longitude: d.longitude
    }))

    try {
      console.log(`Using batch API to calculate ${destinationsToProcess.length} distances from ${source.name} (production limit: ${BATCH_SIZE_LIMIT})`)

      // Early timeout check before batch operation
      if (Date.now() - startTime > timeLimit - 5000) {
        console.warn(`Skipping batch calculation due to time limit for source ${source.name}`)
        return NextResponse.json(results.length > 0 ? results : {
          error: 'Partial results - calculation timeout',
          timeout: true
        }, results.length > 0 ? { status: 200 } : { status: 408 })
      }

      // Add timeout wrapper for batch calculation
      const batchPromise = batchCalculateDistances(origins, destinationLocations)
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Batch calculation timeout')), Math.min(BATCH_TIMEOUT, timeLimit - (Date.now() - startTime)))
      )

      const batchResults = await Promise.race([batchPromise, timeoutPromise])

      // Process batch results
      if (batchResults && batchResults[0]) {
        const sourceResults = batchResults[0]

        for (let i = 0; i < destinationsToProcess.length && i < sourceResults.length; i++) {
          const result = sourceResults[i]
          const destination = destinationsToProcess[i] as { id: number; name: string; latitude: number; longitude: number }

          if (result) {
            const distanceData: DistanceCreateInput = {
              sourceId,
              destinationId: destination.id,
              distance: result.distance,
              duration: result.duration,
              route: result.route,
              directionsUrl: `https://www.google.com/maps/dir/${source.latitude},${source.longitude}/${destination.latitude},${destination.longitude}`
            }

            const distance = await prisma.distance.create({
              data: distanceData,
              include: {
                source: true,
                destination: true,
              },
            })

            results.push(distance)
          }
        }
      }
    } catch (error) {
      console.error(`Batch calculation failed for source ${source.name}:`, error)
      // Fall back to individual calculations with production limit
      const fallbackLimit = Math.min(FALLBACK_LIMIT, missingDestinations.length)

      for (let i = 0; i < fallbackLimit; i++) {
        const destination = missingDestinations[i] as { id: number; name: string; latitude: number; longitude: number }
        try {
          const result = await calculateDistance(
            { latitude: source.latitude, longitude: source.longitude },
            { latitude: destination.latitude, longitude: destination.longitude }
          )

          if (result) {
            const distanceData: DistanceCreateInput = {
              sourceId,
              destinationId: destination.id,
              distance: result.distance,
              duration: result.duration,
              route: result.route,
              ...(result.directionsUrl && { directionsUrl: result.directionsUrl }),
            }

            const distance = await prisma.distance.create({
              data: distanceData,
              include: {
                source: true,
                destination: true,
              },
            })

            results.push(distance)
          }

          // Small delay between fallback calls
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (fallbackError) {
          console.error(`Fallback calculation failed for ${source.name} to ${destination.name}:`, fallbackError)
        }
      }
    }
  }

  console.log(`Completed: Source ${source.name} now has ${results.length} total distances`)

  // Add performance headers for debugging
  const response = NextResponse.json(results)
  response.headers.set('X-Calculation-Type', 'source-to-destinations')
  response.headers.set('X-Total-Results', results.length.toString())
  response.headers.set('X-Environment', IS_PRODUCTION ? 'production' : 'development')

  return response
}

async function calculateDistancesToDestination(destinationId: number) {
  const destination = await prisma.destination.findUnique({ where: { id: destinationId } })
  if (!destination || !destination.latitude || !destination.longitude) {
    return NextResponse.json(
      { error: 'Destination not found or coordinates missing' },
      { status: 404 }
    )
  }

  const sources = await prisma.source.findMany({
    orderBy: { name: 'asc' }
  })

  // Fetch all existing distances for this destination at once (PERFORMANCE FIX)
  const existingDistances = await prisma.distance.findMany({
    where: {
      destinationId: destinationId,
      sourceId: { in: sources.map((s: { id: number }) => s.id) }
    },
    include: {
      source: true,
      destination: true,
    },
  })

  // Create a lookup map for existing distances
  const existingDistanceMap = new Map<number, typeof existingDistances[0]>()
  existingDistances.forEach((distance: { sourceId: number }) => {
    existingDistanceMap.set(distance.sourceId, distance as typeof existingDistances[0])
  })

  // Separate sources into existing and missing
  const missingSources = sources.filter((s: { id: number }) => !existingDistanceMap.has(s.id))
  const results = [...existingDistances] // Start with all existing distances

  console.log(`Destination ${destination.name}: ${existingDistances.length} existing, ${missingSources.length} missing distances`)

  // Use batch calculation for missing distances to prevent timeout
  if (missingSources.length > 0) {
    // Limit batch size for production
    const batchSize = Math.min(BATCH_SIZE_LIMIT, missingSources.length)
    const sourcesToProcess = missingSources.slice(0, batchSize)
    const sourceLocations = sourcesToProcess.map((s: { latitude: number; longitude: number }) => ({
      latitude: s.latitude,
      longitude: s.longitude
    }))
    const destinations = [{ latitude: destination.latitude, longitude: destination.longitude }]

    try {
      console.log(`Using batch API to calculate ${sourcesToProcess.length} distances to ${destination.name} (production limit: ${BATCH_SIZE_LIMIT})`)

      // Add timeout wrapper for batch calculation
      const batchPromise = batchCalculateDistances(sourceLocations, destinations)
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Batch calculation timeout')), BATCH_TIMEOUT)
      )

      const batchResults = await Promise.race([batchPromise, timeoutPromise])

      // Process batch results
      if (batchResults && batchResults.length > 0) {
        for (let i = 0; i < sourcesToProcess.length && i < batchResults.length; i++) {
          const sourceResults = batchResults[i]
          const source = sourcesToProcess[i] as { id: number; name: string; latitude: number; longitude: number }

          if (sourceResults && sourceResults[0]) {
            const result = sourceResults[0]

            const distanceData: DistanceCreateInput = {
              sourceId: source.id,
              destinationId,
              distance: result.distance,
              duration: result.duration,
              route: result.route,
              directionsUrl: `https://www.google.com/maps/dir/${source.latitude},${source.longitude}/${destination.latitude},${destination.longitude}`
            }

            const distance = await prisma.distance.create({
              data: distanceData,
              include: {
                source: true,
                destination: true,
              },
            })

            results.push(distance)
          }
        }
      }
    } catch (error) {
      console.error(`Batch calculation failed for destination ${destination.name}:`, error)
      // Fall back to individual calculations with production limit
      const fallbackLimit = Math.min(FALLBACK_LIMIT, missingSources.length)

      for (let i = 0; i < fallbackLimit; i++) {
        const source = missingSources[i] as { id: number; name: string; latitude: number; longitude: number }
        try {
          const result = await calculateDistance(
            { latitude: source.latitude, longitude: source.longitude },
            { latitude: destination.latitude, longitude: destination.longitude }
          )

          if (result) {
            const distanceData: DistanceCreateInput = {
              sourceId: source.id,
              destinationId,
              distance: result.distance,
              duration: result.duration,
              route: result.route,
              ...(result.directionsUrl && { directionsUrl: result.directionsUrl }),
            }

            const distance = await prisma.distance.create({
              data: distanceData,
              include: {
                source: true,
                destination: true,
              },
            })

            results.push(distance)
          }

          // Small delay between fallback calls
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (fallbackError) {
          console.error(`Fallback calculation failed from ${source.name} to ${destination.name}:`, fallbackError)
        }
      }
    }
  }

  console.log(`Completed: Destination ${destination.name} now has ${results.length} total distances`)

  // Add performance headers for debugging
  const response = NextResponse.json(results)
  response.headers.set('X-Calculation-Type', 'sources-to-destination')
  response.headers.set('X-Total-Results', results.length.toString())
  response.headers.set('X-Environment', IS_PRODUCTION ? 'production' : 'development')

  return response
}

async function calculateAllDistances() {
  const sources = await prisma.source.findMany({
    orderBy: { name: 'asc' }
  })
  const destinations = await prisma.destination.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { name: 'asc' }
  })

  // Fetch ALL existing distances at once (PERFORMANCE FIX)
  const existingDistances = await prisma.distance.findMany({
    include: {
      source: true,
      destination: true,
    },
  })

  // Create a lookup map for existing distances
  const existingDistanceMap = new Map<string, typeof existingDistances[0]>()
  existingDistances.forEach((distance: { sourceId: number; destinationId: number }) => {
    const key = `${distance.sourceId}-${distance.destinationId}`
    existingDistanceMap.set(key, distance as typeof existingDistances[0])
  })

  const results = []
  let calculationCount = 0
  const MAX_CALCULATIONS = 50 // Limit new calculations to prevent timeout

  console.log(`Starting calculation for ${sources.length} sources and ${destinations.length} destinations (max ${MAX_CALCULATIONS} new calculations)`)

  for (const source of sources) {
    if (calculationCount >= MAX_CALCULATIONS) {
      console.log(`Reached maximum calculations limit (${MAX_CALCULATIONS}), stopping`)
      break
    }

    for (const destination of destinations) {
      if (calculationCount >= MAX_CALCULATIONS) break

      const key = `${source.id}-${destination.id}`
      const existingDistance = existingDistanceMap.get(key)

      if (existingDistance) {
        results.push(existingDistance)
      } else if (destination.latitude && destination.longitude) {
        console.log(`Calculating distance from ${source.name} to ${destination.name} (${calculationCount + 1}/${MAX_CALCULATIONS})`)

        const result = await calculateDistance(
          { latitude: source.latitude, longitude: source.longitude },
          { latitude: destination.latitude, longitude: destination.longitude }
        )

        if (result) {
          const distanceData: DistanceCreateInput = {
            sourceId: source.id,
            destinationId: destination.id,
            distance: result.distance,
            duration: result.duration,
            route: result.route,
            ...(result.directionsUrl && { directionsUrl: result.directionsUrl }),
          }

          const distance = await prisma.distance.create({
            data: distanceData,
            include: {
              source: true,
              destination: true,
            },
          })
          calculationCount++
          results.push(distance)

          // Add delay between API calls to respect rate limits
          if (calculationCount % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }
    }
  }

  // Sort results alphabetically by source name, then by destination name
  results.sort((a, b) => {
    if (a.source.name === b.source.name) {
      return a.destination.name.localeCompare(b.destination.name)
    }
    return a.source.name.localeCompare(b.source.name)
  })

  console.log(`Completed: ${calculationCount} new distances calculated, ${results.length} total distances`)
  return NextResponse.json(results)
}
