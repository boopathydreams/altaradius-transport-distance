import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSequences() {
  try {
    console.log('Fixing PostgreSQL sequences...')

    // Fix Source table sequence
    const maxSourceId = await prisma.$queryRaw<[{ max: number }]>`
      SELECT MAX(id) as max FROM "Source"
    `
    const sourceMaxId = maxSourceId[0]?.max || 0
    
    if (sourceMaxId > 0) {
      await prisma.$executeRaw`
        SELECT setval('Source_id_seq', ${sourceMaxId}, true)
      `
      console.log(`Fixed Source sequence to ${sourceMaxId}`)
    }

    // Fix Destination table sequence
    const maxDestinationId = await prisma.$queryRaw<[{ max: number }]>`
      SELECT MAX(id) as max FROM "Destination"
    `
    const destinationMaxId = maxDestinationId[0]?.max || 0
    
    if (destinationMaxId > 0) {
      await prisma.$executeRaw`
        SELECT setval('Destination_id_seq', ${destinationMaxId}, true)
      `
      console.log(`Fixed Destination sequence to ${destinationMaxId}`)
    }

    // Fix Distance table sequence
    const maxDistanceId = await prisma.$queryRaw<[{ max: number }]>`
      SELECT MAX(id) as max FROM "Distance"
    `
    const distanceMaxId = maxDistanceId[0]?.max || 0
    
    if (distanceMaxId > 0) {
      await prisma.$executeRaw`
        SELECT setval('Distance_id_seq', ${distanceMaxId}, true)
      `
      console.log(`Fixed Distance sequence to ${distanceMaxId}`)
    }

    // Fix User table sequence
    const maxUserId = await prisma.$queryRaw<[{ max: number }]>`
      SELECT MAX(id) as max FROM "User"
    `
    const userMaxId = maxUserId[0]?.max || 0
    
    if (userMaxId > 0) {
      await prisma.$executeRaw`
        SELECT setval('User_id_seq', ${userMaxId}, true)
      `
      console.log(`Fixed User sequence to ${userMaxId}`)
    }

    console.log('All sequences fixed successfully!')

  } catch (error) {
    console.error('Error fixing sequences:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixSequences()
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

export { fixSequences }
