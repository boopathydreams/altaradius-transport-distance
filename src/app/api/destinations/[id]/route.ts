import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const destinationId = parseInt(id)

    if (isNaN(destinationId)) {
      return NextResponse.json({ error: 'Invalid destination ID' }, { status: 400 })
    }

    const { name, pincode, address, latitude, longitude } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate pincode if provided and different from current
    if (pincode) {
      const existingDestination = await prisma.destination.findFirst({
        where: {
          pincode: pincode,
          id: { not: destinationId } // Exclude current destination from check
        }
      })

      if (existingDestination) {
        return NextResponse.json(
          {
            error: 'Pincode already exists',
            warning: `A destination with pincode "${pincode}" already exists: "${existingDestination.name}". Please use a different pincode.`,
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

    // Update the destination
    const updatedDestination = await prisma.destination.update({
      where: { id: destinationId },
      data: {
        name: name.trim(),
        pincode: pincode?.trim() || null,
        address: address?.trim() || null,
        latitude: latitude || null,
        longitude: longitude || null,
      }
    })

    return NextResponse.json(updatedDestination)

  } catch (error) {
    console.error('Error updating destination:', error)

    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const destinationId = parseInt(id)

    if (isNaN(destinationId)) {
      return NextResponse.json({ error: 'Invalid destination ID' }, { status: 400 })
    }

    // Check if destination exists
    const destination = await prisma.destination.findUnique({
      where: { id: destinationId }
    })

    if (!destination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    }

    // Count related distances that will be deleted
    const relatedDistancesCount = await prisma.distance.count({
      where: { destinationId: destinationId }
    })

    // Delete the destination (related distances will be deleted due to onDelete: Cascade in schema)
    await prisma.destination.delete({
      where: { id: destinationId }
    })

    console.log(`Deleted destination "${destination.name}" and ${relatedDistancesCount} related distances`)

    return NextResponse.json({
      message: 'Destination deleted successfully',
      deletedDistances: relatedDistancesCount,
      destinationName: destination.name
    })

  } catch (error) {
    console.error('Error deleting destination:', error)

    // Check if it's a Prisma constraint error
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
