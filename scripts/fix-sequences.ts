import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSequences() {
  try {
    console.log('Fixing all sequences...')

    const tables = ['Source', 'Destination', 'Distance', 'User']
    
    for (const table of tables) {
      try {
        // Get max ID for current table using dynamic query
        const maxIdQuery = `SELECT MAX(id) as max FROM "${table}"`
        const result = await prisma.$queryRawUnsafe<[{ max: number }]>(maxIdQuery)
        const maxId = result[0]?.max || 0

        if (maxId > 0) {
          // Fix sequence to next available ID
          const sequenceQuery = `SELECT setval(pg_get_serial_sequence('public."${table}"', 'id'), ${maxId + 1}, false)`
          await prisma.$queryRawUnsafe(sequenceQuery)
          console.log(`✅ Fixed ${table} sequence to ${maxId + 1}`)
        } else {
          console.log(`⚠️  ${table} table is empty, skipping`)
        }
      } catch (error) {
        console.error(`❌ Error fixing ${table} sequence:`, error instanceof Error ? error.message : String(error))
      }
    }

    console.log('All sequences processed!')

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  fixSequences()
    .catch(error => {
      console.error('Failed:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    })
}

export { fixSequences }
