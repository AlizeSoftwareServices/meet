const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.profile.findFirst({
    where: { username: { contains: 'alize' } }
  });
  const schedule = await prisma.availability.findFirst({
    where: { userId: profile.userId }
  });
  console.log('Target schedule:', schedule);

  try {
    const id = schedule.id;
    const name = schedule.name || 'Working Hours';
    const isDefault = schedule.isDefault ?? false;
    const timezone = schedule.timezone || 'Asia/Calcutta';
    const slots = [
      { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 1, startTime: '19:30', endTime: '23:30' },
      { dayOfWeek: 2, startTime: '17:30', endTime: '20:30' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' }
    ];
    const overrides = [];

    // Delete existing
    await prisma.$transaction([
      prisma.availabilitySlot.deleteMany({ where: { availabilityId: id } }),
      prisma.availabilityOverride.deleteMany({ where: { availabilityId: id } }),
    ]);

    await prisma.availability.update({
      where: { id },
      data: { name, isDefault, timezone }
    });

    if (slots && slots.length > 0) {
      await prisma.availabilitySlot.createMany({
        data: slots.map(slot => ({
          availabilityId: id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    }

    console.log('Successfully updated schedule!');
  } catch (err) {
    console.error('Error during schedule update:', err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
