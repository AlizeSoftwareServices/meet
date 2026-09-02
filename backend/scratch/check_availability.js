const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.profile.findFirst({
    where: { username: { contains: 'alize' } }
  });
  console.log('Profile username:', profile?.username);

  const schedule = await prisma.availability.findFirst({
    where: { userId: profile.userId },
    include: { slots: true }
  });
  console.log('Schedule:', JSON.stringify(schedule, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
