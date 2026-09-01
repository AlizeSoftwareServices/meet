import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dummyNames = [
    'P5C Team',
    'Verification Team',
    'Phase 5A Team',
    'Phase 5B Team',
    'Test Team'
  ];

  console.log('Searching for dummy teams...');
  const teams = await prisma.team.findMany({
    where: {
      name: {
        in: dummyNames
      }
    }
  });

  if (teams.length === 0) {
    console.log('No dummy teams found.');
  } else {
    for (const team of teams) {
      console.log(`Deleting team: ${team.name} (${team.id})`);
      await prisma.team.delete({
        where: { id: team.id }
      });
    }
    console.log('Dummy teams deleted successfully!');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
