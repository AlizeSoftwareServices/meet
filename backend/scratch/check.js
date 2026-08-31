const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const votes = await prisma.pollVote.findMany({ where: { guestEmail: 'voter1@example.com' } });
  console.log('Votes count:', votes.length);
  console.log(votes);
}

check().finally(() => prisma.$disconnect());
