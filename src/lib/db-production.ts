import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as any

const createPrismaClient = () =>
  new PrismaClient({
    log: ['query'],
  }).$extends(withAccelerate())

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
