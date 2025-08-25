import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sourceId = parseInt(params.id)

    if (isNaN(sourceId)) {
      return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 })
    }

    // Check if source exists
    const source = await prisma.source.findUnique({
      where: { id: sourceId }
    })

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    // Count related distances that will be deleted
    const relatedDistancesCount = await prisma.distance.count({
      where: { sourceId: sourceId }
    })

    // Delete the source (related distances will be deleted due to onDelete: Cascade in schema)
    await prisma.source.delete({
      where: { id: sourceId }
    })

    console.log(`Deleted source "${source.name}" and ${relatedDistancesCount} related distances`)

    return NextResponse.json({
      message: 'Source deleted successfully',
      deletedDistances: relatedDistancesCount,
      sourceName: source.name
    })

  } catch (error) {
    console.error('Error deleting source:', error)

    // Check if it's a Prisma constraint error
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
