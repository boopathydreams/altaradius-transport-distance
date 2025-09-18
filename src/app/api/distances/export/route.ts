import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import * as XLSX from 'xlsx'
import type { Source, Destination } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const sourceFilter = searchParams.get('sourceFilter') || ''
    const destinationFilter = searchParams.get('destinationFilter') || ''

    console.log('Starting Excel export with filters:', { sourceFilter, destinationFilter })

    // Build filter conditions
    const sourceWhere = sourceFilter ? {
      name: {
        contains: sourceFilter,
        mode: 'insensitive' as const
      }
    } : {}

    const destinationWhere = destinationFilter ? {
      name: {
        contains: destinationFilter,
        mode: 'insensitive' as const
      }
    } : {}

    // Get all sources and destinations that match the filters
    const [sources, destinations]: [Source[], Destination[]] = await Promise.all([
      prisma.source.findMany({
        where: sourceWhere,
        orderBy: { name: 'asc' }
      }),
      prisma.destination.findMany({
        where: destinationWhere,
        orderBy: { name: 'asc' }
      })
    ])

    // Sort sources and destinations case-insensitively for proper alphabetical order
    sources.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    destinations.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

    if (sources.length === 0 || destinations.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 })
    }

    // Check if the dataset is too large (prevent memory issues)
    const totalCells = sources.length * destinations.length
    if (totalCells > 50000) {
      return NextResponse.json({
        error: `Dataset too large: ${sources.length} sources × ${destinations.length} destinations = ${totalCells.toLocaleString()} cells. Please apply filters to reduce the size.`
      }, { status: 400 })
    }

    console.log(`Exporting matrix: ${sources.length} sources × ${destinations.length} destinations`)

    // Process distances in chunks to avoid memory issues
    const CHUNK_SIZE = 1000
    const sourceIds = sources.map((s: Source) => s.id)
    const destinationIds = destinations.map((d: Destination) => d.id)

    // Create a distance lookup map for efficient access
    const distanceMap = new Map<string, number>()

    // Process in chunks
    for (let i = 0; i < sourceIds.length; i += CHUNK_SIZE) {
      const sourceChunk = sourceIds.slice(i, i + CHUNK_SIZE)

      const chunkDistances = await prisma.distance.findMany({
        where: {
          sourceId: { in: sourceChunk },
          destinationId: { in: destinationIds }
        },
        select: {
          sourceId: true,
          destinationId: true,
          distance: true
        }
      })

      // Add to the distance map
      chunkDistances.forEach((distance: { sourceId: number; destinationId: number; distance: number }) => {
        const key = `${distance.sourceId}-${distance.destinationId}`
        distanceMap.set(key, distance.distance)
      })
    }

    console.log(`Processed ${distanceMap.size} distance records in chunks`)

    // Create the matrix data
    const matrixData: (string | number | null)[][] = []

    // First row: headers (destination column, pincode column, then source names)
    const headerRow: (string | number | null)[] = ['Destination', 'Pincode', ...sources.map((s: Source) => s.name)]
    matrixData.push(headerRow)

    // Data rows: destination name + pincode + distances for each source
    destinations.forEach((destination: Destination) => {
      const row: (string | number | null)[] = [
        destination.name,
        destination.pincode || ''
      ]

      sources.forEach((source: Source) => {
        const key = `${source.id}-${destination.id}`
        const distance = distanceMap.get(key)
        row.push(distance !== undefined ? Number(distance.toFixed(1)) : null)
      })

      matrixData.push(row)
    })

    console.log(`Matrix created: ${matrixData.length} rows × ${matrixData[0]?.length} columns`)

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(matrixData)

    // Set column widths for better readability
    const columnWidths = [
      { wch: 25 }, // Destination column
      { wch: 12 }, // Pincode column
      ...sources.map(() => ({ wch: 15 })) // Source columns
    ]
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    const timestamp = new Date().toISOString().slice(0, 10)
    const sheetName = `Distance Matrix ${timestamp}`
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // Create 2x Distance Matrix (To & Fro)
    const matrix2xData: (string | number | null)[][] = []

    // First row: headers (same as main sheet)
    const header2xRow: (string | number | null)[] = ['Destination', 'Pincode', ...sources.map((s: Source) => s.name)]
    matrix2xData.push(header2xRow)

    // Data rows: destination name + pincode + distances * 2 for each source
    destinations.forEach((destination: Destination) => {
      const row: (string | number | null)[] = [
        destination.name,
        destination.pincode || ''
      ]

      sources.forEach((source: Source) => {
        const key = `${source.id}-${destination.id}`
        const distance = distanceMap.get(key)
        // Double the distance for to & fro calculation
        row.push(distance !== undefined ? Number((distance * 2).toFixed(1)) : null)
      })

      matrix2xData.push(row)
    })

    console.log(`2x Distance Matrix created: ${matrix2xData.length} rows × ${matrix2xData[0]?.length} columns`)

    // Create 2x Distance worksheet
    const worksheet2x = XLSX.utils.aoa_to_sheet(matrix2xData)

    // Set column widths for 2x Distance sheet (same as main sheet)
    worksheet2x['!cols'] = columnWidths

    // Add 2x Distance worksheet to workbook
    const sheetName2x = `2x Distance Matrix ${timestamp}`
    XLSX.utils.book_append_sheet(workbook, worksheet2x, sheetName2x)

    // Add metadata sheet
    const metadataData = [
      ['Export Information'],
      ['Generated on', new Date().toLocaleString()],
      ['Generated by', "Altaradius"],
      ['Generated for', "Vignesh Aravind Transports"],
      ['Source filter', sourceFilter || 'None'],
      ['Destination filter', destinationFilter || 'None'],
      ['Total sources', sources.length],
      ['Total destinations', destinations.length],
      ['Total distance records', distanceMap.size],
      [''],
      ['Sheets Included'],
      ['1. Distance Matrix - One-way distances in kilometers'],
      ['2. 2x Distance Matrix - Round-trip distances (to & fro)'],
      [''],
      ['Instructions'],
      ['- Rows represent destinations'],
      ['- Columns represent sources'],
      ['- Values in Sheet 1 are one-way distances'],
      ['- Values in Sheet 2 are doubled for round-trip calculations'],
      ['- Empty cells indicate no calculated route']
    ]

    const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData)
    metadataSheet['!cols'] = [{ wch: 25 }, { wch: 40 }]

    // Make headers in metadata sheet bold - Most compatible approach
    const metadataHeaders = [0, 10, 14] // "Export Information", "Sheets Included", and "Instructions" rows
    metadataHeaders.forEach(rowIndex => {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: 0 })
      const cell = metadataSheet[cellAddr]
      if (cell) {
        // Ensure the cell is an object with proper structure
        if (typeof cell === 'string' || typeof cell === 'number') {
          metadataSheet[cellAddr] = { v: cell, t: 's' }
        }
        metadataSheet[cellAddr].s = {
          font: {
            bold: true,
            sz: 12
          }
        }
      }
    })

    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Export Info')

    // Generate Excel buffer with styling support
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
      cellStyles: true,
      bookSST: false
    })

    console.log(`Excel file generated: ${excelBuffer.length} bytes`)

    // Generate filename
    let filename = `vat-distance-matrix-${timestamp}`
    if (sourceFilter || destinationFilter) {
      const filters = []
      if (sourceFilter) filters.push(`src-${sourceFilter.replace(/[^a-zA-Z0-9]/g, '')}`)
      if (destinationFilter) filters.push(`dest-${destinationFilter.replace(/[^a-zA-Z0-9]/g, '')}`)
      filename += `-${filters.join('-')}`
    }
    filename += '.xlsx'

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Error generating Excel export:', error)

    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message?: string }

      if (prismaError.code === 'P5000' || prismaError.code === 'P6009') {
        return NextResponse.json(
          {
            error: 'Dataset too large for export. Please apply filters to reduce the number of sources and destinations.',
            hint: 'Try filtering by specific source or destination names to reduce the dataset size.'
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate Excel export' },
      { status: 500 }
    )
  }
}
