import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts and statistics efficiently
    const [sourceCount, destinationCount, distanceCount] = await Promise.all([
      prisma.source.count(),
      prisma.destination.count(),
      prisma.distance.count()
    ])

    const totalPossibleDistances = sourceCount * destinationCount
    const missingDistances = totalPossibleDistances - distanceCount
    const completionPercentage = totalPossibleDistances > 0 ?
      Math.round((distanceCount / totalPossibleDistances) * 100) : 0

    const stats = {
      sources: sourceCount,
      destinations: destinationCount,
      calculatedDistances: distanceCount,
      totalPossibleDistances,
      missingDistances,
      completionPercentage,
      lastUpdated: new Date().toISOString()
    }

    console.log('Distance statistics:', stats)
    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error getting distance statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
