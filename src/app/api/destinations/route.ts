import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { geocodeAddressWithFallbacks } from '@/lib/googleMaps'
import type { Destination } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const destinations = await prisma.destination.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(destinations)
  } catch (error) {
    console.error('Error fetching destinations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update destinations that don't have coordinates
    const destinationsWithoutCoords = await prisma.destination.findMany({
      where: {
        OR: [
          { latitude: null },
          { longitude: null }
        ]
      }
    })

    const updatePromises = destinationsWithoutCoords.map(async (destination: Destination) => {
      console.log(`Attempting to geocode destination "${destination.name}"`)

      const location = await geocodeAddressWithFallbacks(
        destination.name,
        destination.pincode,
        destination.address
      )

      if (location) {
        console.log(`Successfully geocoded "${destination.name}": ${location.latitude}, ${location.longitude}`)
        return prisma.destination.update({
          where: { id: destination.id },
          data: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        })
      } else {
        console.log(`Failed to geocode destination: ${destination.name}`)
      }
      return null
    })

    const results = await Promise.allSettled(updatePromises)
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length

    return NextResponse.json({
      message: `Updated coordinates for ${successful} destinations`,
      updated: successful,
      total: destinationsWithoutCoords.length
    })
  } catch (error) {
    console.error('Error updating destination coordinates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, pincode, address, latitude, longitude } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate pincode if provided
    if (pincode) {
      const existingDestination = await prisma.destination.findFirst({
        where: {
          pincode: pincode
        }
      })

      if (existingDestination) {
        return NextResponse.json(
          {
            error: 'Pincode already exists',
            warning: `A destination with pincode "${pincode}" already exists: "${existingDestination.name}". Please use a different pincode or update the existing destination.`,
            existingDestination: {
              id: existingDestination.id,
              name: existingDestination.name,
              pincode: existingDestination.pincode
            }
          },
          { status: 409 }
        )
      }
    }

    let finalLatitude = latitude
    let finalLongitude = longitude

    // If coordinates are not provided, try to geocode using enhanced geocoding
    if ((typeof latitude !== 'number' || typeof longitude !== 'number')) {
      const location = await geocodeAddressWithFallbacks(name, pincode, address)

      if (location) {
        finalLatitude = location.latitude
        finalLongitude = location.longitude
      }
    }

    const destination = await prisma.destination.create({
      data: {
        name,
        pincode: pincode || null,
        address: address || null,
        latitude: finalLatitude || null,
        longitude: finalLongitude || null,
      }
    })

    return NextResponse.json(destination, { status: 201 })
  } catch (error) {
    console.error('Error creating destination:', error)

    // Check if it's a Prisma unique constraint error
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A destination with this information already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
