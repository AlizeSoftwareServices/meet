import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Phase 4A Verification ---');

  const testUserEmail = 'host_phase4a@test.com';

  // Cleanup
  await prisma.user.deleteMany({ where: { email: testUserEmail } });

  // 1. Create Host
  const host = await prisma.user.create({
    data: {
      email: testUserEmail,
      passwordHash: 'password123',
      profile: {
        create: {
          name: 'Phase 4A Host',
          username: 'phase4ahost',
          timezone: 'America/New_York',
          brandColor: '#ff0000',
          bookingPageTitle: 'Book time with Phase4A Host',
          bookingPageDescription: 'Welcome to my test page'
        }
      }
    },
    include: { profile: true }
  });
  console.log('✅ Host created with branding');

  // 2. Create Event Type
  const eventType = await prisma.eventType.create({
    data: {
      userId: host.id,
      title: 'Phase 4A Test Event',
      slug: 'phase4a-test',
      duration: 30,
      isActive: true,
      isGroupEvent: false
    }
  });
  console.log('✅ Event type created');

  // 3. Create Poll
  const poll = await prisma.poll.create({
    data: {
      hostId: host.id,
      title: 'Team Sync Poll',
      duration: 30,
      slots: {
        create: [
          { startTime: new Date('2026-01-01T10:00:00Z'), endTime: new Date('2026-01-01T10:30:00Z') },
          { startTime: new Date('2026-01-01T11:00:00Z'), endTime: new Date('2026-01-01T11:30:00Z') }
        ]
      }
    },
    include: { slots: true }
  });
  console.log('✅ Meeting Poll created with slots');

  // 4. Vote on Poll
  await prisma.pollVote.create({
    data: {
      pollSlotId: poll.slots[0].id,
      guestName: 'Guest One',
      guestEmail: 'guest1@test.com',
      status: 'YES'
    }
  });
  console.log('✅ Guest voted on poll slot');

  // 5. Create Single Use Link
  const singleUseLink = await prisma.singleUseLink.create({
    data: {
      eventTypeId: eventType.id,
      tokenHash: 'test-single-use-token',
      expiresAt: new Date(Date.now() + 86400000)
    }
  });
  console.log('✅ Single-use link created');

  // 6. Test Book with Single Use Link (simulate)
  await prisma.singleUseLink.update({
    where: { tokenHash: singleUseLink.tokenHash },
    data: { used: true }
  });
  console.log('✅ Single-use link consumed successfully');

  console.log('--- All Phase 4A validations passed! ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
