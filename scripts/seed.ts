import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface SourceCSV {
  source_id: string
  area: string
  lat: string
  lon: string
  original_url: string
}

interface DestinationCSV {
  dest_id: string
  area: string
  pincode: string
}

function parseCSV<T>(content: string): T[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  return lines.slice(1).map(line => {
    // Handle CSV parsing with quoted values that may contain commas
    const values: string[] = []
    let currentValue = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true
      } else if (char === '"' && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim())
        currentValue = ''
        continue
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim())

    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    return obj as T
  })
}

async function main() {
  try {
    console.log('🌱 Starting database seed...')

    // Create default admin user
    const hashedPassword = await hashPassword('vignesh@vat')
    await prisma.user.upsert({
      where: { username: 'vignesh' },
      update: {},
      create: {
        username: 'vignesh',
        password: hashedPassword,
      },
    })
    console.log('✅ Created admin user (username: admin, password: admin123)')

    // Read and parse sources CSV
    const sourcesPath = join(process.cwd(), 'data', 'sources.csv')
    const sourcesContent = readFileSync(sourcesPath, 'utf-8')
    const sourcesData = parseCSV<SourceCSV>(sourcesContent)

    console.log(`📍 Processing ${sourcesData.length} sources...`)

    for (const source of sourcesData) {
      await prisma.source.upsert({
        where: { id: parseInt(source.source_id.replace('S', '')) || 0 },
        update: {},
        create: {
          name: source.area,
          latitude: parseFloat(source.lat),
          longitude: parseFloat(source.lon),
          address: source.area,
        },
      })
    }
    console.log('✅ Sources seeded successfully')

    // Read and parse destinations CSV
    const destinationsPath = join(process.cwd(), 'data', 'destinations.csv')
    const destinationsContent = readFileSync(destinationsPath, 'utf-8')
    const destinationsData = parseCSV<DestinationCSV>(destinationsContent)

    console.log(`🎯 Processing ${destinationsData.length} destinations...`)

    for (const destination of destinationsData) {
      await prisma.destination.upsert({
        where: { id: parseInt(destination.dest_id.replace('D', '')) || 0 },
        update: {},
        create: {
          name: destination.area.replace(/"/g, ''), // Remove quotes
          pincode: destination.pincode,
          address: destination.area.replace(/"/g, ''),
        },
      })
    }
    console.log('✅ Destinations seeded successfully')

    console.log('🎉 Database seeded successfully!')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
