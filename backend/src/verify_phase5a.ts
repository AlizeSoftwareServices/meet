import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { BookingsService } from './bookings/bookings.service';
import { EventTypesService } from './event-types/event-types.service';
import { TeamsService } from './teams/teams.service';
import { PushController } from './users/push.controller';
import { PublicService } from './public/public.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

async function upsertTestUser(prisma: PrismaService, email: string, username: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.availabilitySlot.deleteMany({ where: { availability: { userId: existing.id } } });
    await prisma.availabilityOverride.deleteMany({ where: { availability: { userId: existing.id } } });
    await prisma.availability.deleteMany({ where: { userId: existing.id } });
  }

  const userId = existing ? existing.id : (await prisma.user.create({
    data: {
      email,
      passwordHash: 'dummy',
      profile: {
        create: { name, username, timezone: 'UTC' }
      }
    }
  })).id;

  await prisma.availability.create({
    data: {
      userId: userId,
      name: 'Default Test Schedule',
      isDefault: true,
      timezone: 'UTC',
      slots: {
        create: [1, 2, 3, 4, 5].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' }))
      }
    }
  });

  return prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } });
}

async function runVerification() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const bookingsService = app.get(BookingsService);
  const eventTypesService = app.get(EventTypesService);
  const teamsService = app.get(TeamsService);
  const pushController = app.get(PushController);
  const publicService = app.get(PublicService);

  console.log('=== Starting Phase 5A Production Verification ===\n');

  try {
    // Setup Test Users
    const hostA = await upsertTestUser(prisma, 'p5a_hosta@test.com', 'p5a_hosta', 'Host A');
    const hostB = await upsertTestUser(prisma, 'p5a_hostb@test.com', 'p5a_hostb', 'Host B');
    const attacker = await upsertTestUser(prisma, 'p5a_attacker@test.com', 'p5a_attacker', 'Attacker');

    // Clean up past test data
    await prisma.pushToken.deleteMany({ where: { userId: { in: [hostA.id, hostB.id, attacker.id] } } });
    await prisma.booking.deleteMany({ where: { eventType: { userId: { in: [hostA.id, hostB.id, attacker.id] } } } });
    await prisma.team.deleteMany({ where: { ownerId: { in: [hostA.id, hostB.id, attacker.id] } } });
    await prisma.eventType.deleteMany({ where: { userId: { in: [hostA.id, hostB.id, attacker.id] } } });

    // ----------------------------------------------------
    // TEST 1 & 2: Collective Booking & Secondary Host Visibility/Conflict
    // ----------------------------------------------------
    console.log('--- Test 1 & 2: Secondary Host Visibility & Conflict Detection ---');
    
    // Create Team
    const team = await teamsService.create(hostA.id, { name: 'Phase 5A Team', slug: 'p5a-team' });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: hostB.id, role: 'MEMBER' }
    });

    // Create Collective Event
    const collectiveEvent = await eventTypesService.create(hostA.id, {
      title: 'Phase 5A Collective',
      slug: 'p5a-collective',
      duration: 30,
      schedulingType: 'COLLECTIVE',
      teamId: team.id,
      hostIds: [hostA.id, hostB.id]
    });

    // Pick a weekday time in UTC
    const slotDate = new Date();
    while (slotDate.getUTCDay() !== 2) { // Tuesday
      slotDate.setUTCDate(slotDate.getUTCDate() + 1);
    }
    slotDate.setUTCHours(11, 0, 0, 0);
    const slotEndDate = new Date(slotDate.getTime() + 30 * 60000);

    // Book Collective Event
    const colBooking = await bookingsService.createBooking({
      eventTypeId: collectiveEvent.id,
      guestName: 'Guest Collective',
      guestEmail: 'guest_col@test.com',
      startTime: slotDate.toISOString(),
      endTime: slotEndDate.toISOString()
    });

    // Test 1: Secondary Host Visibility
    const hostBBookings = await bookingsService.getHostBookings(hostB.id);
    const hasColBookingInHostB = hostBBookings.some((b: any) => b.id === colBooking.bookings[0].id);
    if (!hasColBookingInHostB) {
      throw new Error('Test 1 Failed: Secondary Host B cannot see Collective booking in getHostBookings');
    }
    console.log('✅ Test 1 Passed: Secondary Host B correctly sees Collective booking in /bookings/host');

    // Test 2: Secondary Host Conflict Checking
    // Create personal event for Host B
    const hostBPersonalEvent = await eventTypesService.create(hostB.id, {
      title: 'Host B Personal',
      slug: 'hostb-personal',
      duration: 30,
      schedulingType: 'PERSONAL'
    });

    let secondaryConflictBlocked = false;
    try {
      await bookingsService.createBooking({
        eventTypeId: hostBPersonalEvent.id,
        guestName: 'Guest 2',
        guestEmail: 'guest2@test.com',
        startTime: slotDate.toISOString(),
        endTime: slotEndDate.toISOString()
      });
    } catch (e: any) {
      secondaryConflictBlocked = true;
    }

    if (!secondaryConflictBlocked) {
      throw new Error('Test 2 Failed: Secondary Host B was double booked despite having a Collective meeting!');
    }
    console.log('✅ Test 2 Passed: Secondary Host conflict correctly blocked concurrent double-booking');

    // ----------------------------------------------------
    // TEST 3: Push Token Registration & Deletion
    // ----------------------------------------------------
    console.log('\n--- Test 3: Mobile Push Token Registration & Deletion ---');
    const testToken = 'fcm_test_token_phase5a_12345';
    
    // Register
    await pushController.registerToken({ user: { userId: hostA.id } }, { token: testToken, platform: 'ANDROID' });
    let tokenRecord = await prisma.pushToken.findUnique({ where: { token: testToken } });
    if (!tokenRecord || tokenRecord.userId !== hostA.id || tokenRecord.platform !== 'ANDROID') {
      throw new Error('Test 3 Failed: Push token not registered properly');
    }

    // Upsert on re-registration
    await pushController.registerToken({ user: { userId: hostA.id } }, { token: testToken, platform: 'ANDROID' });
    const tokenCount = await prisma.pushToken.count({ where: { token: testToken } });
    if (tokenCount !== 1) {
      throw new Error('Test 3 Failed: Push token duplicated on upsert');
    }

    // Delete
    await pushController.unregisterTokenByBody({ user: { userId: hostA.id } }, { token: testToken });
    tokenRecord = await prisma.pushToken.findUnique({ where: { token: testToken } });
    if (tokenRecord) {
      throw new Error('Test 3 Failed: Push token not deleted');
    }
    console.log('✅ Test 3 Passed: Push token registration, upsert, and deletion verified');

    // ----------------------------------------------------
    // TEST 4: IDOR Protection
    // ----------------------------------------------------
    console.log('\n--- Test 4: Cross-User IDOR Protection ---');
    
    // Register token for Host A
    await pushController.registerToken({ user: { userId: hostA.id } }, { token: testToken, platform: 'ANDROID' });
    
    // Attacker attempts to delete Host A's token
    const deleteResult = await pushController.unregisterTokenByBody({ user: { userId: attacker.id } }, { token: testToken });
    if (deleteResult.count !== 0) {
      throw new Error('Test 4 Failed: Attacker successfully deleted Host A push token');
    }

    // Attacker attempts to edit Host A event type
    let idorBlocked = false;
    try {
      await eventTypesService.update(collectiveEvent.id, attacker.id, { title: 'Hacked Event' });
    } catch (e: any) {
      idorBlocked = true;
    }
    if (!idorBlocked) {
      throw new Error('Test 4 Failed: Attacker was able to update Host A event type');
    }
    console.log('✅ Test 4 Passed: IDOR strictly blocked across push tokens and event types');

    // ----------------------------------------------------
    // TEST 5: Inactive / Archived Event Safety
    // ----------------------------------------------------
    console.log('\n--- Test 5: Inactive / Archived Event Safety ---');
    await eventTypesService.update(hostBPersonalEvent.id, hostB.id, { isActive: false });

    let archiveSlotBlocked = false;
    try {
      const slots = await publicService.getAvailableSlots('p5a_hostb', 'hostb-personal', '2026-09-01');
      if (slots.length === 0) archiveSlotBlocked = true;
    } catch (e) {
      archiveSlotBlocked = true;
    }

    let archiveBookingBlocked = false;
    try {
      await bookingsService.createBooking({
        eventTypeId: hostBPersonalEvent.id,
        guestName: 'Test',
        guestEmail: 'test@test.com',
        startTime: slotDate.toISOString(),
        endTime: slotEndDate.toISOString()
      });
    } catch (e) {
      archiveBookingBlocked = true;
    }

    if (!archiveSlotBlocked || !archiveBookingBlocked) {
      throw new Error('Test 5 Failed: Inactive event allowed public booking or slot fetching');
    }
    console.log('✅ Test 5 Passed: Archived/inactive events are strictly blocked from public booking');

    // ----------------------------------------------------
    // TEST 6: Team Event Editing (PERSONAL -> ROUND_ROBIN -> COLLECTIVE)
    // ----------------------------------------------------
    console.log('\n--- Test 6: Team Event Type Mutation ---');
    const editableEvent = await eventTypesService.create(hostA.id, {
      title: 'Mutable Event',
      slug: 'mutable-event',
      duration: 15,
      schedulingType: 'PERSONAL'
    });

    // Convert to ROUND_ROBIN
    const updatedToRR = await eventTypesService.update(editableEvent.id, hostA.id, {
      schedulingType: 'ROUND_ROBIN',
      teamId: team.id,
      hostIds: [hostA.id, hostB.id]
    });
    if (updatedToRR.schedulingType !== 'ROUND_ROBIN' || updatedToRR.hosts.length !== 2) {
      throw new Error('Test 6 Failed: Failed to mutate event to ROUND_ROBIN');
    }

    // Convert to COLLECTIVE
    const updatedToCol = await eventTypesService.update(editableEvent.id, hostA.id, {
      schedulingType: 'COLLECTIVE',
      teamId: team.id,
      hostIds: [hostA.id, hostB.id]
    });
    if (updatedToCol.schedulingType !== 'COLLECTIVE' || updatedToCol.hosts.length !== 2) {
      throw new Error('Test 6 Failed: Failed to mutate event to COLLECTIVE');
    }
    console.log('✅ Test 6 Passed: Dynamic conversion between Personal, Round Robin, and Collective verified');

    // ----------------------------------------------------
    // TEST 7: Personal Booking Regression
    // ----------------------------------------------------
    console.log('\n--- Test 7: Personal Booking Regression ---');
    const personalEvent = await eventTypesService.create(hostA.id, {
      title: 'Personal 15',
      slug: 'personal-15',
      duration: 15,
      schedulingType: 'PERSONAL'
    });

    const personalSlotDate = new Date();
    while (personalSlotDate.getUTCDay() !== 3) { // Wednesday
      personalSlotDate.setUTCDate(personalSlotDate.getUTCDate() + 1);
    }
    personalSlotDate.setUTCHours(14, 0, 0, 0);
    const personalSlotEndDate = new Date(personalSlotDate.getTime() + 15 * 60000);

    const personalBooking = await bookingsService.createBooking({
      eventTypeId: personalEvent.id,
      guestName: 'Personal Guest',
      guestEmail: 'personal_guest@test.com',
      startTime: personalSlotDate.toISOString(),
      endTime: personalSlotEndDate.toISOString()
    });
    if (!personalBooking.bookings[0]?.id) {
      throw new Error('Test 7 Failed: Personal booking creation failed');
    }
    console.log('✅ Test 7 Passed: Standard personal 1-on-1 booking verified');

    // ----------------------------------------------------
    // TEST 8: Round Robin Regression
    // ----------------------------------------------------
    console.log('\n--- Test 8: Round Robin Least-Busy Assignment ---');
    const rrSlotDate = new Date();
    while (rrSlotDate.getUTCDay() !== 4) { // Thursday
      rrSlotDate.setUTCDate(rrSlotDate.getUTCDate() + 1);
    }
    rrSlotDate.setUTCHours(10, 0, 0, 0);
    const rrSlotEndDate = new Date(rrSlotDate.getTime() + 30 * 60000);

    // Make Host A busy at this slot
    await prisma.booking.create({
      data: {
        hostId: hostA.id,
        eventTypeId: personalEvent.id,
        guestName: 'Blocker',
        guestEmail: 'blocker@test.com',
        startTime: rrSlotDate,
        endTime: rrSlotEndDate,
        status: 'CONFIRMED'
      }
    });

    // Create dedicated Round Robin event
    const rrEvent = await eventTypesService.create(hostA.id, {
      title: 'Dedicated Round Robin',
      slug: 'dedicated-rr',
      duration: 30,
      schedulingType: 'ROUND_ROBIN',
      teamId: team.id,
      hostIds: [hostA.id, hostB.id]
    });

    const rrBooking = await bookingsService.createBooking({
      eventTypeId: rrEvent.id,
      guestName: 'RR Guest',
      guestEmail: 'rr_guest@test.com',
      startTime: rrSlotDate.toISOString(),
      endTime: rrSlotEndDate.toISOString()
    });

    const assignedBookingHost = await prisma.bookingHost.findFirst({
      where: { bookingId: rrBooking.bookings[0].id }
    });
    if (assignedBookingHost?.userId !== hostB.id) {
      throw new Error('Test 8 Failed: Round robin did not assign to free Host B');
    }
    console.log('✅ Test 8 Passed: Round Robin correctly assigned to available Host B');

    // ----------------------------------------------------
    // TEST 9: Collective Regression (All Hosts Assigned)
    // ----------------------------------------------------
    console.log('\n--- Test 9: Collective Host Assignment ---');
    const colAssignedHosts = await prisma.bookingHost.findMany({
      where: { bookingId: colBooking.bookings[0].id }
    });
    if (colAssignedHosts.length !== 2) {
      throw new Error('Test 9 Failed: Collective booking did not assign both hosts');
    }
    console.log('✅ Test 9 Passed: Collective booking assigned all required hosts');

    // ----------------------------------------------------
    // TEST 10: Cancellation & Slot Recovery
    // ----------------------------------------------------
    console.log('\n--- Test 10: Cancellation Slot Recovery ---');
    // Cancel the personal booking
    await bookingsService.cancelBooking(personalBooking.bookings[0].id, hostA.id, 'Test cancel');
    
    // Now the slot should be available again
    const rebooked = await bookingsService.createBooking({
      eventTypeId: personalEvent.id,
      guestName: 'Rebook Guest',
      guestEmail: 'rebook@test.com',
      startTime: personalSlotDate.toISOString(),
      endTime: personalSlotEndDate.toISOString()
    });
    if (!rebooked.bookings[0]?.id) {
      throw new Error('Test 10 Failed: Slot could not be rebooked after cancellation');
    }
    console.log('✅ Test 10 Passed: Cancelled booking slot successfully freed and rebooked');

    console.log('\n=============================================');
    console.log('🎉 ALL 10 PHASE 5A PRODUCTION TESTS PASSED!');
    console.log('=============================================\n');

  } catch (error) {
    console.error('\n❌ Phase 5A Verification FAILED:\n', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runVerification();
