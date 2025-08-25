import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { calculateDistance, geocodeAddressWithFallbacks } from '@/lib/googleMaps'

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

    // Scenario 4: No parameters - calculate all missing distances
    return await calculateAllDistances()
  } catch (error) {
    console.error('Error calculating distances:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
  const source = await prisma.source.findUnique({ where: { id: sourceId } })
  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  const destinations = await prisma.destination.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { name: 'asc' }
  })

  const results = []

  for (const destination of destinations) {
    let distance = await prisma.distance.findUnique({
      where: {
        sourceId_destinationId: {
          sourceId,
          destinationId: destination.id,
        },
      },
      include: {
        source: true,
        destination: true,
      },
    })

    if (!distance && destination.latitude && destination.longitude) {
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

        distance = await prisma.distance.create({
          data: distanceData,
          include: {
            source: true,
            destination: true,
          },
        })
      }
    }

    if (distance) {
      results.push(distance)
    }
  }

  return NextResponse.json(results)
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
  const results = []

  for (const source of sources) {
    let distance = await prisma.distance.findUnique({
      where: {
        sourceId_destinationId: {
          sourceId: source.id,
          destinationId,
        },
      },
      include: {
        source: true,
        destination: true,
      },
    })

    if (!distance) {
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

        distance = await prisma.distance.create({
          data: distanceData,
          include: {
            source: true,
            destination: true,
          },
        })
      }
    }

    if (distance) {
      results.push(distance)
    }
  }

  return NextResponse.json(results)
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

  const results = []
  let calculationCount = 0

  console.log(`Starting calculation for ${sources.length} sources and ${destinations.length} destinations`)

  for (const source of sources) {
    for (const destination of destinations) {
      let distance = await prisma.distance.findUnique({
        where: {
          sourceId_destinationId: {
            sourceId: source.id,
            destinationId: destination.id,
          },
        },
        include: {
          source: true,
          destination: true,
        },
      })

      if (!distance && destination.latitude && destination.longitude) {
        console.log(`Calculating distance from ${source.name} to ${destination.name}`)

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

          distance = await prisma.distance.create({
            data: distanceData,
            include: {
              source: true,
              destination: true,
            },
          })
          calculationCount++
        }

        // Add a small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (distance) {
        results.push(distance)
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
