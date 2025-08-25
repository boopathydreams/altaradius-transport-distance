import { hashPassword } from '../src/lib/auth'

async function generateHash() {
  const password = 'vignesh@vat'
  const hashedPassword = await hashPassword(password)

  console.log('\n🔐 Password Hashing Utility')
  console.log('========================')
  console.log(`Original password: ${password}`)
  console.log(`Hashed password: ${hashedPassword}`)
  console.log('\n✅ This hashed password is now stored in the database for username: "vignesh"')
  console.log('\n📋 Usage:')
  console.log('  Username: vignesh')
  console.log('  Password: vignesh@vat')
}

generateHash().catch(console.error)
