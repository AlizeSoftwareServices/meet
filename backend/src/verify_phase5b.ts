import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { BookingsService } from './bookings/bookings.service';
import { EventTypesService } from './event-types/event-types.service';
import { TeamsService } from './teams/teams.service';
import { PushController } from './users/push.controller';
import { PublicService } from './public/public.service';
import { IntegrationsController } from './integrations/integrations.controller';

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
  const integrationsController = app.get(IntegrationsController);

  console.log('=== Starting Phase 5B Mobile Production Verification ===\n');

  try {
    // Setup Test Users
    const hostA = await upsertTestUser(prisma, 'p5b_hosta@test.com', 'p5b_hosta', 'Host A');
    const hostB = await upsertTestUser(prisma, 'p5b_hostb@test.com', 'p5b_hostb', 'Host B');
    const mobileUser = await upsertTestUser(prisma, 'p5b_mobile@test.com', 'p5b_mobile', 'Mobile User');

    // Clean up past test data
    await prisma.pushToken.deleteMany({ where: { userId: { in: [hostA.id, hostB.id, mobileUser.id] } } });
    await prisma.booking.deleteMany({ where: { eventType: { userId: { in: [hostA.id, hostB.id, mobileUser.id] } } } });
    await prisma.team.deleteMany({ where: { ownerId: { in: [hostA.id, hostB.id, mobileUser.id] } } });
    await prisma.eventType.deleteMany({ where: { userId: { in: [hostA.id, hostB.id, mobileUser.id] } } });

    // ----------------------------------------------------
    // TEST 1: Mobile Platform Push Token (Android & iOS)
    // ----------------------------------------------------
    console.log('--- Test 1 & 2: Mobile Push Token Registration & Platform Lifecycle ---');
    const androidFcmToken = 'fcm_android_prod_token_5b_9999';
    const iosApnsToken = 'apns_ios_prod_token_5b_8888';

    // Register Android token
    await pushController.registerToken({ user: { userId: mobileUser.id } }, { token: androidFcmToken, platform: 'ANDROID' });
    let androidRecord = await prisma.pushToken.findUnique({ where: { token: androidFcmToken } });
    if (!androidRecord || androidRecord.platform !== 'ANDROID' || androidRecord.userId !== mobileUser.id) {
      throw new Error('Test 1 Failed: Android FCM push token was not registered correctly');
    }

    // Register iOS token
    await pushController.registerToken({ user: { userId: mobileUser.id } }, { token: iosApnsToken, platform: 'IOS' });
    let iosRecord = await prisma.pushToken.findUnique({ where: { token: iosApnsToken } });
    if (!iosRecord || iosRecord.platform !== 'IOS' || iosRecord.userId !== mobileUser.id) {
      throw new Error('Test 1 Failed: iOS APNS push token was not registered correctly');
    }
    console.log('✅ Test 1 Passed: Both Android (FCM) and iOS (APNs) push tokens registered with platform metadata');

    // Test 2: Push Token Cleanup on Logout
    await pushController.unregisterTokenByBody({ user: { userId: mobileUser.id } }, { token: androidFcmToken });
    await pushController.unregisterTokenByParam({ user: { userId: mobileUser.id } }, iosApnsToken);

    const remainingTokens = await prisma.pushToken.count({ where: { userId: mobileUser.id } });
    if (remainingTokens !== 0) {
      throw new Error('Test 2 Failed: Push tokens remained after logout cleanup');
    }
    console.log('✅ Test 2 Passed: Push tokens cleaned up on logout (body & param endpoints)');

    // ----------------------------------------------------
    // TEST 3: OAuth Mobile Custom Scheme Deep Linking
    // ----------------------------------------------------
    console.log('\n--- Test 3: OAuth Dynamic Redirects & Mobile Deep Link Scheme ---');
    const googleAuthRes = await integrationsController.getGoogleAuthUrl({ user: { userId: mobileUser.id } }, 'meetapp://oauth-callback');
    if (!googleAuthRes.url || !googleAuthRes.url.includes('state=')) {
      throw new Error('Test 3 Failed: Google OAuth URL generation failed');
    }
    console.log('✅ Test 3 Passed: Dynamic OAuth deep-link state generated for mobile scheme (meetapp://)');

    // ----------------------------------------------------
    // TEST 4: Archived/Inactive Event Safety on Mobile
    // ----------------------------------------------------
    console.log('\n--- Test 4: Archived/Inactive Event Safety ---');
    const archivedEvent = await eventTypesService.create(hostA.id, {
      title: 'Archived Mobile Event',
      slug: 'archived-mobile',
      duration: 30,
      schedulingType: 'PERSONAL',
      isActive: false
    });

    let publicSlotBlocked = false;
    try {
      await publicService.getAvailableSlots('p5b_hosta', 'archived-mobile', '2026-09-01');
    } catch {
      publicSlotBlocked = true;
    }
    if (!publicSlotBlocked) {
      throw new Error('Test 4 Failed: Archived event allowed slot queries');
    }
    console.log('✅ Test 4 Passed: Archived event is completely inaccessible for public/mobile queries');

    // ----------------------------------------------------
    // TEST 5: Personal 1-on-1 Mobile Booking
    // ----------------------------------------------------
    console.log('\n--- Test 5: Personal 1-on-1 Mobile Booking ---');
    const personalEvent = await eventTypesService.create(hostA.id, {
      title: 'Mobile Personal 30',
      slug: 'mobile-personal-30',
      duration: 30,
      schedulingType: 'PERSONAL'
    });

    const slotDate = new Date();
    while (slotDate.getUTCDay() !== 2) { // Tuesday
      slotDate.setUTCDate(slotDate.getUTCDate() + 1);
    }
    slotDate.setUTCHours(10, 0, 0, 0);
    const slotEndDate = new Date(slotDate.getTime() + 30 * 60000);

    const personalBooking = await bookingsService.createBooking({
      eventTypeId: personalEvent.id,
      guestName: 'Mobile User',
      guestEmail: 'mobile_guest@test.com',
      startTime: slotDate.toISOString(),
      endTime: slotEndDate.toISOString()
    });
    if (!personalBooking.bookings[0]?.id) {
      throw new Error('Test 5 Failed: Personal mobile booking creation failed');
    }
    console.log('✅ Test 5 Passed: Standard 1-on-1 personal booking succeeded');

    // ----------------------------------------------------
    // TEST 6: Team Round Robin Least-Busy Assignment
    // ----------------------------------------------------
    console.log('\n--- Test 6: Team Round Robin Booking ---');
    const team = await teamsService.create(hostA.id, { name: 'Mobile Team', slug: 'mobile-team' });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: hostB.id, role: 'MEMBER' }
    });

    const rrEvent = await eventTypesService.create(hostA.id, {
      title: 'Mobile RR 30',
      slug: 'mobile-rr-30',
      duration: 30,
      schedulingType: 'ROUND_ROBIN',
      teamId: team.id,
      hostIds: [hostA.id, hostB.id]
    });

    const rrSlotDate = new Date();
    while (rrSlotDate.getUTCDay() !== 3) { // Wednesday
      rrSlotDate.setUTCDate(rrSlotDate.getUTCDate() + 1);
    }
    rrSlotDate.setUTCHours(11, 0, 0, 0);
    const rrSlotEndDate = new Date(rrSlotDate.getTime() + 30 * 60000);

    // Make Host A busy at rrSlotDate
    await prisma.booking.create({
      data: {
        hostId: hostA.id,
        eventTypeId: personalEvent.id,
        guestName: 'Busy A',
        guestEmail: 'busy_a@test.com',
        startTime: rrSlotDate,
        endTime: rrSlotEndDate,
        status: 'CONFIRMED'
      }
    });

    const rrBooking = await bookingsService.createBooking({
      eventTypeId: rrEvent.id,
      guestName: 'RR Invitee',
      guestEmail: 'rr_invitee@test.com',
      startTime: rrSlotDate.toISOString(),
      endTime: rrSlotEndDate.toISOString()
    });

    const assignedHost = await prisma.bookingHost.findFirst({
      where: { bookingId: rrBooking.bookings[0].id }
    });
    if (assignedHost?.userId !== hostB.id) {
      throw new Error('Test 6 Failed: Round Robin did not assign to free Host B');
    }
    console.log('✅ Test 6 Passed: Round Robin selected available Host B');

    // ----------------------------------------------------
    // TEST 7: Collective Multi-Host Booking
    // ----------------------------------------------------
    console.log('\n--- Test 7: Collective Multi-Host Booking ---');
    const colEvent = await eventTypesService.create(hostA.id, {
      title: 'Mobile Collective 30',
      slug: 'mobile-col-30',
      duration: 30,
      schedulingType: 'COLLECTIVE',
      teamId: team.id,
      hostIds: [hostA.id, hostB.id]
    });

    const colSlotDate = new Date();
    while (colSlotDate.getUTCDay() !== 4) { // Thursday
      colSlotDate.setUTCDate(colSlotDate.getUTCDate() + 1);
    }
    colSlotDate.setUTCHours(15, 0, 0, 0);
    const colSlotEndDate = new Date(colSlotDate.getTime() + 30 * 60000);

    const colBooking = await bookingsService.createBooking({
      eventTypeId: colEvent.id,
      guestName: 'Col Invitee',
      guestEmail: 'col_invitee@test.com',
      startTime: colSlotDate.toISOString(),
      endTime: colSlotEndDate.toISOString()
    });

    const assignedColHosts = await prisma.bookingHost.findMany({
      where: { bookingId: colBooking.bookings[0].id }
    });
    if (assignedColHosts.length !== 2) {
      throw new Error('Test 7 Failed: Collective booking did not assign both hosts');
    }
    console.log('✅ Test 7 Passed: Collective booking assigned all required team hosts');

    // ----------------------------------------------------
    // TEST 8: Secondary Host Visibility in /bookings/host
    // ----------------------------------------------------
    console.log('\n--- Test 8: Secondary Host Visibility ---');
    const hostBBookings = await bookingsService.getHostBookings(hostB.id);
    const foundColInHostB = hostBBookings.some((b: any) => b.id === colBooking.bookings[0].id);
    if (!foundColInHostB) {
      throw new Error('Test 8 Failed: Secondary host B cannot see collective booking');
    }
    console.log('✅ Test 8 Passed: Secondary co-host B sees collective booking in /bookings/host');

    // ----------------------------------------------------
    // TEST 9: Multi-Host Conflict Protection
    // ----------------------------------------------------
    console.log('\n--- Test 9: Multi-Host Conflict Protection ---');
    let conflictBlocked = false;
    try {
      await bookingsService.createBooking({
        eventTypeId: personalEvent.id,
        guestName: 'Conflict Tester',
        guestEmail: 'conflict@test.com',
        startTime: colSlotDate.toISOString(),
        endTime: colSlotEndDate.toISOString()
      });
    } catch {
      conflictBlocked = true;
    }
    if (!conflictBlocked) {
      throw new Error('Test 9 Failed: Double-booking allowed during Collective meeting');
    }
    console.log('✅ Test 9 Passed: Concurrent booking blocked by Collective meeting');

    // ----------------------------------------------------
    // TEST 10: Cancellation & Slot Recovery
    // ----------------------------------------------------
    console.log('\n--- Test 10: Cancellation Slot Recovery ---');
    await bookingsService.cancelBooking(personalBooking.bookings[0].id, hostA.id, 'Mobile test cancel');
    const rebooked = await bookingsService.createBooking({
      eventTypeId: personalEvent.id,
      guestName: 'Rebooker',
      guestEmail: 'rebooker@test.com',
      startTime: slotDate.toISOString(),
      endTime: slotEndDate.toISOString()
    });
    if (!rebooked.bookings[0]?.id) {
      throw new Error('Test 10 Failed: Slot could not be rebooked after cancellation');
    }
    console.log('✅ Test 10 Passed: Slot successfully freed and rebooked after cancellation');

    console.log('\n=============================================');
    console.log('🎉 ALL 10 PHASE 5B PRODUCTION TESTS PASSED!');
    console.log('=============================================\n');

  } catch (error) {
    console.error('\n❌ Phase 5B Verification FAILED:\n', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runVerification();
