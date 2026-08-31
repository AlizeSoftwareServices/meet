const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const host = await prisma.user.create({ data: { email: 'idx_test@example.com' } });
  const poll = await prisma.poll.create({
    data: { hostId: host.id, title: 'Test', duration: 30 }
  });
  const slot = await prisma.pollSlot.create({
    data: { pollId: poll.id, startTime: new Date(), endTime: new Date() }
  });

  console.log('Inserting first vote...');
  await prisma.pollVote.create({
    data: { pollSlotId: slot.id, guestName: 'Test', guestEmail: 'a@b.com', status: 'YES' }
  });

  console.log('Inserting second vote (duplicate)...');
  try {
    await prisma.pollVote.create({
      data: { pollSlotId: slot.id, guestName: 'Test2', guestEmail: 'a@b.com', status: 'NO' }
    });
    console.log('Second vote succeeded! (INDEX IS MISSING)');
  } catch (e) {
    console.log('Second vote failed as expected:', e.message);
  }

  await prisma.user.delete({ where: { id: host.id } });
}

run().finally(() => prisma.$disconnect());
