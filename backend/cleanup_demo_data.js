const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDemoData() {
  try {
    console.log('Starting cleanup of demo teams and test users...');

    // 1. Delete Bookings belonging to test users
    const testUsers = await prisma.user.findMany({
      where: { email: { endsWith: '@test.com' } },
      select: { id: true }
    });
    
    const testUserIds = testUsers.map(u => u.id);

    if (testUserIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { hostId: { in: testUserIds } }
      });
      console.log('Deleted bookings for test users.');
      
      // Delete event types
      await prisma.eventType.deleteMany({
        where: { userId: { in: testUserIds } }
      });

      // Now delete the users
      const deletedUsers = await prisma.user.deleteMany({
        where: { email: { endsWith: '@test.com' } }
      });
      console.log(`Deleted ${deletedUsers.count} test users.`);
    } else {
      console.log('No test users found.');
    }

    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDemoData();
