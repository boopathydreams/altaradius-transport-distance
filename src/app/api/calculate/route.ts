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

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('sourceId')
    const destinationId = searchParams.get('destinationId')
    const batch = searchParams.get('batch') === 'true'

    // Single distance calculation
    if (sourceId && destinationId) {
      return await calculateSingleDistance(parseInt(sourceId), parseInt(destinationId))
    }

    // Batch calculations with limits for Vercel
    if (batch) {
      return await calculateBatchDistances()
    }

    // Source-specific calculation
    if (sourceId) {
      return await calculateDistancesFromSource(parseInt(sourceId))
    }

    // Destination-specific calculation
    if (destinationId) {
      return await calculateDistancesToDestination(parseInt(destinationId))
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })

  } catch (error) {
    console.error('Error in calculate API:', error)
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
    const location = await geocodeAddressWithFallbacks(
      destination.name,
      destination.pincode,
      destination.address
    )

    if (location) {
      destination = await prisma.destination.update({
        where: { id: destinationId },
        data: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      })
    } else {
      return NextResponse.json(
        { error: `Could not geocode destination "${destination.name}".` },
        { status: 422 }
      )
    }
  }

  // Calculate distance using Google Maps API
  const result = await calculateDistance(
    { latitude: source.latitude, longitude: source.longitude },
    { latitude: destination.latitude!, longitude: destination.longitude! }
  )

  if (!result) {
    return NextResponse.json(
      { error: 'Could not calculate distance' },
      { status: 500 }
    )
  }

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
  let calculationCount = 0

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
        calculationCount++
      }

      // Rate limiting delay
      if (calculationCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (distance) {
      results.push(distance)
    }
  }

  console.log(`Completed: ${calculationCount} new distances calculated from source ${sourceId}`)
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
  let calculationCount = 0

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
        calculationCount++
      }

      // Rate limiting delay
      if (calculationCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (distance) {
      results.push(distance)
    }
  }

  console.log(`Completed: ${calculationCount} new distances calculated to destination ${destinationId}`)
  return NextResponse.json(results)
}

// Limited batch calculation to avoid timeouts
async function calculateBatchDistances() {
  const BATCH_SIZE = 20 // Process max 20 missing distances per request

  // Find missing distances (where combinations don't exist)
  const sources = await prisma.source.findMany({
    select: { id: true },
    take: 10, // Limit sources for timeout prevention
    orderBy: { name: 'asc' }
  })

  const destinations = await prisma.destination.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true },
    take: 10, // Limit destinations for timeout prevention
    orderBy: { name: 'asc' }
  })

  const results = []
  let calculationCount = 0

  // Process in batches to stay within time limits
  for (const source of sources) {
    if (calculationCount >= BATCH_SIZE) break

    for (const destination of destinations) {
      if (calculationCount >= BATCH_SIZE) break

      // Check if distance already exists
      const existingDistance = await prisma.distance.findUnique({
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

      if (existingDistance) {
        results.push(existingDistance)
        continue
      }

      // Calculate new distance (this is the expensive operation)
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calculate?sourceId=${source.id}&destinationId=${destination.id}`, {
          method: 'POST'
        })

        if (response.ok) {
          const [newDistance] = await response.json()
          if (newDistance) {
            results.push(newDistance)
            calculationCount++
          }
        }
      } catch (error) {
        console.error(`Error calculating distance ${source.id}-${destination.id}:`, error)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log(`Batch calculation completed: ${calculationCount} new distances calculated`)
  return NextResponse.json({
    message: `Processed ${calculationCount} calculations`,
    results: results.slice(-calculationCount), // Return only new calculations
    totalResults: results.length
  })
}
