import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('sourceId')
    const destinationId = searchParams.get('destinationId')

    if (!sourceId || !destinationId) {
      return NextResponse.json(
        { error: 'Both sourceId and destinationId are required' },
        { status: 400 }
      )
    }

    console.log(`Checking for existing distance: Source ${sourceId} -> Destination ${destinationId}`)

    // Check if distance already exists for this source-destination pair
    const existingDistance = await prisma.distance.findFirst({
      where: {
        sourceId: parseInt(sourceId),
        destinationId: parseInt(destinationId),
      },
      include: {
        source: true,
        destination: true,
      },
    })

    if (existingDistance) {
      console.log(`Found existing distance: ${existingDistance.distance}m, ${existingDistance.duration}s`)
      return NextResponse.json({
        exists: true,
        distance: existingDistance
      })
    } else {
      console.log('No existing distance found')
      return NextResponse.json({
        exists: false,
        distance: null
      })
    }

  } catch (error) {
    console.error('Error checking distance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
