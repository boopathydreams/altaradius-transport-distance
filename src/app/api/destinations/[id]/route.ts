import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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
