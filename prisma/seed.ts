import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ca-firm.com' },
    update: {},
    create: {
      email: 'admin@ca-firm.com',
      name: 'Admin Partner',
      role: 'ADMIN',
      passwordHash,
    },
  })

  // Create Senior Staff
  const senior = await prisma.user.upsert({
    where: { email: 'senior@ca-firm.com' },
    update: {},
    create: {
      email: 'senior@ca-firm.com',
      name: 'Senior Accountant',
      role: 'SENIOR_STAFF',
      passwordHash,
    },
  })

  // Create Junior Staff
  const junior = await prisma.user.upsert({
    where: { email: 'junior@ca-firm.com' },
    update: {},
    create: {
      email: 'junior@ca-firm.com',
      name: 'Junior Clerk',
      role: 'JUNIOR_STAFF',
      passwordHash,
    },
  })

  // Create Billing Staff
  const billing = await prisma.user.upsert({
    where: { email: 'billing@ca-firm.com' },
    update: {},
    create: {
      email: 'billing@ca-firm.com',
      name: 'Billing Exec',
      role: 'BILLING',
      passwordHash,
    },
  })

  console.log({ admin, senior, junior, billing })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
