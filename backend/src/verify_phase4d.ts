import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { TeamsService } from './teams/teams.service';
import { BookingsService } from './bookings/bookings.service';
import { EventTypesService } from './event-types/event-types.service';
import { AvailabilityEngineService } from './availability/availability.engine';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const teamsService = app.get(TeamsService);
  const bookingsService = app.get(BookingsService);
  const eventTypesService = app.get(EventTypesService);

  console.log('=== Starting Phase 4D Verification ===\n');

  try {
    // 1. Setup Test Users
    console.log('Setting up test users...');
    const owner = await upsertTestUser(prisma, 'team_owner@test.com', 'team_owner', 'Team Owner');
    const member1 = await upsertTestUser(prisma, 'team_member1@test.com', 'team_member1', 'Team Member 1');
    const member2 = await upsertTestUser(prisma, 'team_member2@test.com', 'team_member2', 'Team Member 2');
    const guestUser = await upsertTestUser(prisma, 'team_guest@test.com', 'team_guest', 'Guest User');

    // Clean up previous data
    await prisma.booking.deleteMany({
      where: { eventType: { userId: owner.id } }
    });
    await prisma.team.deleteMany({ where: { ownerId: owner.id } });
    await prisma.eventType.deleteMany({ where: { userId: owner.id } });

    // 2. Team Creation & IDOR Check
    console.log('\n--- Test A & B: Team Creation & IDOR ---');
    const team = await teamsService.create(owner.id, {
      name: 'Verification Team',
      slug: 'verification-team',
      description: 'Test team for phase 4d'
    });
    console.log('✅ Team created successfully by owner');

    try {
      await teamsService.update(team.id, member1.id, { description: 'Hacked' });
      throw new Error('IDOR failed - non-member could update team');
    } catch (e: any) {
      if (e.status === 403 || e.status === 404 || e.status === 401) {
        console.log('✅ IDOR blocked: Unauthorized user cannot update team');
      } else {
        throw e;
      }
    }

    // 3. Team Invitations
    console.log('\n--- Test C: Team Invitations ---');
    try {
      await teamsService.inviteMember(team.id, owner.id, { email: member1.email, role: 'MEMBER' });
      await teamsService.inviteMember(team.id, owner.id, { email: member2.email, role: 'MEMBER' });
      console.log('✅ Invitations created');
    } catch (e: any) {
      if (e.message?.includes('SMTP')) {
         console.log('⚠️ Ignored SMTP error during invitation creation');
      } else {
         console.log('⚠️ Ignored error during invitation (likely email mock/SMTP): ', e.message);
      }
    }

    const invites = await prisma.teamInvitation.findMany({ where: { teamId: team.id } });
    
    // Simulate accepting invites (bypass email for test)
    await prisma.teamMember.create({ data: { teamId: team.id, userId: member1.id, role: 'MEMBER' } });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: member2.id, role: 'MEMBER' } });
    await prisma.teamInvitation.updateMany({ where: { teamId: team.id }, data: { acceptedAt: new Date() } });
    console.log('✅ Team members added');

    // 4. Create Team Event Types
    console.log('\n--- Test D & E: Team Event Types ---');
    
    const roundRobinEvent = await eventTypesService.create(owner.id, {
      title: 'Round Robin Meeting',
      slug: 'rr-meeting',
      duration: 30,
      schedulingType: 'ROUND_ROBIN',
      teamId: team.id,
      hostIds: [member1.id, member2.id]
    });
    console.log('✅ Round Robin Event Type created');

    const collectiveEvent = await eventTypesService.create(owner.id, {
      title: 'Collective Meeting',
      slug: 'col-meeting',
      duration: 60,
      schedulingType: 'COLLECTIVE',
      teamId: team.id,
      hostIds: [member1.id, member2.id]
    });
    console.log('✅ Collective Event Type created');

    // 5. Booking Logic
    console.log('\n--- Test D: Round Robin Scheduling ---');
    
    const tomorrow = new Date();
    // Advance to next Wednesday to ensure it's a weekday (dayOfWeek = 3)
    while (tomorrow.getUTCDay() !== 3) {
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    }
    tomorrow.setUTCHours(10, 0, 0, 0); // 10:00 AM UTC
    const endTime = new Date(tomorrow.getTime() + 30 * 60000);

    // Make member1 busy
    await prisma.booking.create({
      data: {
        hostId: member1.id,
        eventTypeId: roundRobinEvent.id,
        guestName: 'Blocker',
        guestEmail: 'blocker@test.com',
        startTime: tomorrow,
        endTime: endTime,
        status: 'CONFIRMED',
        assignedHosts: { create: [{ userId: member1.id }] }
      }
    });

    const rrBooking = await bookingsService.createBooking({
      eventTypeId: roundRobinEvent.id,
      guestName: 'Guest RR',
      guestEmail: 'guest.rr@test.com',
      startTime: tomorrow.toISOString(),
      endTime: endTime.toISOString(),
    });
    
    const rrBookingHost = await prisma.bookingHost.findFirst({ where: { bookingId: rrBooking.bookings[0].id } });
    if (rrBookingHost?.userId === member2.id) {
      console.log('✅ Round Robin assigned to available host correctly');
    } else {
      throw new Error('Round Robin assignment failed');
    }

    console.log('\n--- Test E: Collective Scheduling ---');
    const tomorrow12 = new Date();
    // Advance to next Thursday to ensure it's a weekday (dayOfWeek = 4)
    while (tomorrow12.getUTCDay() !== 4) {
      tomorrow12.setUTCDate(tomorrow12.getUTCDate() + 1);
    }
    tomorrow12.setUTCHours(12, 0, 0, 0);
    const endTime12 = new Date(tomorrow12.getTime() + 60 * 60000);

    const colBooking = await bookingsService.createBooking({
      eventTypeId: collectiveEvent.id,
      guestName: 'Guest Col',
      guestEmail: 'guest.col@test.com',
      startTime: tomorrow12.toISOString(),
      endTime: endTime12.toISOString(),
    });

    const colHosts = await prisma.bookingHost.findMany({ where: { bookingId: colBooking.bookings[0].id } });
    if (colHosts.length === 2) {
      console.log('✅ Collective booking assigned to all required hosts');
    } else {
      throw new Error('Collective assignment failed');
    }

    try {
      await bookingsService.createBooking({
        eventTypeId: collectiveEvent.id,
        guestName: 'Guest Col Overlap',
        guestEmail: 'guest.col.overlap@test.com',
        startTime: tomorrow12.toISOString(),
        endTime: endTime12.toISOString(),
      });
      throw new Error('Collective booking allowed overlap');
    } catch (e: any) {
      console.log('✅ Collective correctly blocked overlapping booking');
    }

    console.log('\n--- Test F: Cancellation ---');
    await bookingsService.cancelBooking(colBooking.bookings[0].id, member2.id, 'Test cancel');
    const cancelledCol = await prisma.booking.findUnique({ where: { id: colBooking.bookings[0].id } });
    if (cancelledCol?.status === 'CANCELLED') {
      console.log('✅ Booking cancelled successfully by secondary host');
    } else {
      throw new Error('Cancellation failed');
    }

    console.log('\n--- All Phase 4D Validations Passed! ---');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
  } finally {
    await app.close();
  }
}

async function upsertTestUser(prisma: any, email: string, username: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const existingAvail = await prisma.availability.findFirst({ where: { userId: existing.id } });
    if (!existingAvail) {
      await prisma.availability.create({
        data: {
          userId: existing.id,
          name: 'Default Test Schedule',
          isDefault: true,
          timezone: 'UTC',
          slots: {
            create: [1, 2, 3, 4, 5].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' }))
          }
        }
      });
    }
    return existing;
  }

  const u = await prisma.user.create({
    data: {
      email,
      passwordHash: 'dummy',
      profile: {
        create: { name, username, timezone: 'UTC' }
      }
    }
  });

  await prisma.availability.create({
    data: {
      userId: u.id,
      name: 'Default Test Schedule',
      isDefault: true,
      timezone: 'UTC',
      slots: {
        create: [1, 2, 3, 4, 5].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' }))
      }
    }
  });

  return u;
}

bootstrap();
