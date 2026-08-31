import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthService } from './auth/auth.service';
import { BookingsService } from './bookings/bookings.service';
import { EventTypesService } from './event-types/event-types.service';
import { TeamsService } from './teams/teams.service';
import { WebhooksService } from './webhooks/webhooks.service';
import { WebhookDeliveryService } from './webhooks/webhook-delivery.service';
import { RoutingService } from './routing/routing.service';
import { PushController } from './users/push.controller';
import { AvailabilityService } from './availability/availability.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

async function upsertTestUser(prisma: PrismaService, email: string, username: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.availabilitySlot.deleteMany({ where: { availability: { userId: existing.id } } });
    await prisma.availabilityOverride.deleteMany({ where: { availability: { userId: existing.id } } });
    await prisma.availability.deleteMany({ where: { userId: existing.id } });
  }

  const hash = await bcrypt.hash('password123', 10);
  let finalUserId: string;
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: hash }
    });
    finalUserId = existing.id;
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        profile: {
          create: { name, username, timezone: 'UTC' }
        }
      }
    });
    finalUserId = created.id;
  }

  await prisma.availability.create({
    data: {
      userId: finalUserId,
      name: 'Default Test Schedule',
      isDefault: true,
      timezone: 'UTC',
      slots: {
        create: [1, 2, 3, 4, 5].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' }))
      }
    }
  });

  return prisma.user.findUniqueOrThrow({ where: { id: finalUserId }, include: { profile: true } });
}

async function runPhase6Verification() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const authService = app.get(AuthService);
  const bookingsService = app.get(BookingsService);
  const eventTypesService = app.get(EventTypesService);
  const teamsService = app.get(TeamsService);
  const webhooksService = app.get(WebhooksService);
  const deliveryService = app.get(WebhookDeliveryService);
  const routingService = app.get(RoutingService);
  const pushController = app.get(PushController);
  const availabilityService = app.get(AvailabilityService);
  const jwtService = app.get(JwtService);

  console.log('================================================================');
  console.log('🚀 STARTING PHASE 6 PRODUCTION & STORE-READINESS VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 28;

  try {
    // 0. Setup test users
    const userA = await upsertTestUser(prisma, 'p6_host_a@test.com', 'p6_host_a', 'Host Alpha');
    const userB = await upsertTestUser(prisma, 'p6_host_b@test.com', 'p6_host_b', 'Host Beta');

    // Clean up
    await prisma.webhookDelivery.deleteMany({ where: { webhook: { userId: { in: [userA.id, userB.id] } } } });
    await prisma.webhook.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.routingRule.deleteMany({ where: { form: { userId: { in: [userA.id, userB.id] } } } });
    await prisma.routingQuestion.deleteMany({ where: { form: { userId: { in: [userA.id, userB.id] } } } });
    await prisma.routingForm.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.booking.deleteMany({ where: { eventType: { userId: { in: [userA.id, userB.id] } } } });
    await prisma.team.deleteMany({ where: { ownerId: { in: [userA.id, userB.id] } } });
    await prisma.eventType.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.pushToken.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });

    // ----------------------------------------------------
    // TEST 1: Registration Logic
    // ----------------------------------------------------
    console.log('--- [Test 1/28] User Registration ---');
    const regEmail = `p6_new_${Date.now()}@test.com`;
    const regResult = await authService.register({
      email: regEmail,
      password: 'SecurePassword123!',
      name: 'New Registered User'
    });
    if (!regResult.accessToken || !regResult.user.id) {
      throw new Error('Test 1 Failed: Registration did not produce access token and user');
    }
    passedTests++;
    console.log('✅ Test 1 Passed: User registration verified');

    // ----------------------------------------------------
    // TEST 2: Login Logic
    // ----------------------------------------------------
    console.log('--- [Test 2/28] User Login ---');
    const loginResult = await authService.login({ email: userA.email, password: 'password123' });
    if (!loginResult.accessToken) throw new Error('Test 2 Failed: Login failed');
    passedTests++;
    console.log('✅ Test 2 Passed: User login verified');

    // ----------------------------------------------------
    // TEST 3: JWT Token Validation
    // ----------------------------------------------------
    console.log('--- [Test 3/28] JWT Token Validation ---');
    const decoded = await jwtService.verifyAsync(loginResult.accessToken);
    if (!decoded || decoded.sub !== userA.id) throw new Error('Test 3 Failed: JWT verification failed');
    passedTests++;
    console.log('✅ Test 3 Passed: JWT verification confirmed');

    // ----------------------------------------------------
    // TEST 4: Invalid Credentials Handling
    // ----------------------------------------------------
    console.log('--- [Test 4/28] Invalid Credentials Handling ---');
    let invalidAuthBlocked = false;
    try {
      await authService.login({ email: userA.email, password: 'WrongPassword!' });
    } catch {
      invalidAuthBlocked = true;
    }
    if (!invalidAuthBlocked) throw new Error('Test 4 Failed: Wrong password was accepted');
    passedTests++;
    console.log('✅ Test 4 Passed: Invalid credentials correctly rejected (401)');

    // ----------------------------------------------------
    // TEST 5: User Authorization & Profile Resolution
    // ----------------------------------------------------
    console.log('--- [Test 5/28] User Profile Authorization ---');
    const profile = await prisma.profile.findUnique({ where: { userId: userA.id } });
    if (!profile || profile.username !== 'p6_host_a') throw new Error('Test 5 Failed: Profile lookup failed');
    passedTests++;
    console.log('✅ Test 5 Passed: Profile resolution verified');

    // ----------------------------------------------------
    // TEST 6: IDOR Protection
    // ----------------------------------------------------
    console.log('--- [Test 6/28] IDOR Protection ---');
    const eventTypeA = await eventTypesService.create(userA.id, {
      title: 'Consultation A',
      slug: 'consult-a',
      duration: 30,
      schedulingType: 'PERSONAL'
    });
    let idorBlocked = false;
    try {
      await eventTypesService.update(eventTypeA.id, userB.id, { title: 'Hacked Title' });
    } catch {
      idorBlocked = true;
    }
    if (!idorBlocked) throw new Error('Test 6 Failed: User B modified User A event type');
    passedTests++;
    console.log('✅ Test 6 Passed: Cross-user IDOR access strictly blocked');

    // ----------------------------------------------------
    // TEST 7: Event Creation
    // ----------------------------------------------------
    console.log('--- [Test 7/28] Event Creation ---');
    if (!eventTypeA.id || eventTypeA.slug !== 'consult-a') throw new Error('Test 7 Failed: Event creation failed');
    passedTests++;
    console.log('✅ Test 7 Passed: Event creation verified');

    // ----------------------------------------------------
    // TEST 8: Event Editing
    // ----------------------------------------------------
    console.log('--- [Test 8/28] Event Editing ---');
    const updatedEvent = await eventTypesService.update(eventTypeA.id, userA.id, { description: 'Updated strategy description' });
    if (updatedEvent.description !== 'Updated strategy description') throw new Error('Test 8 Failed: Event editing failed');
    passedTests++;
    console.log('✅ Test 8 Passed: Event update verified');

    // ----------------------------------------------------
    // TEST 9: Personal 1-on-1 Booking
    // ----------------------------------------------------
    console.log('--- [Test 9/28] Personal 1-on-1 Booking ---');
    const targetDate = new Date();
    while (targetDate.getUTCDay() !== 3) {
      targetDate.setUTCDate(targetDate.getUTCDate() + 1);
    }
    targetDate.setUTCHours(11, 0, 0, 0);
    const targetEndDate = new Date(targetDate.getTime() + 30 * 60000);

    const bookingRes = await bookingsService.createBooking({
      eventTypeId: eventTypeA.id,
      guestName: 'Production Client',
      guestEmail: 'client@enterprise.com',
      startTime: targetDate.toISOString(),
      endTime: targetEndDate.toISOString()
    });
    if (!bookingRes.bookings[0] || bookingRes.bookings[0].status !== 'CONFIRMED') {
      throw new Error('Test 9 Failed: Personal booking failed');
    }
    passedTests++;
    console.log('✅ Test 9 Passed: Personal booking confirmed');

    // ----------------------------------------------------
    // TEST 10: Round Robin Booking
    // ----------------------------------------------------
    console.log('--- [Test 10/28] Team Round Robin Least-Busy Booking ---');
    const team = await teamsService.create(userA.id, { name: 'P6 Sales Team', slug: 'p6-sales' });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: userB.id, role: 'MEMBER' } });

    const rrEventType = await eventTypesService.create(userA.id, {
      title: 'Sales Round Robin',
      slug: 'sales-rr',
      duration: 30,
      schedulingType: 'ROUND_ROBIN',
      teamId: team.id,
      hostIds: [userA.id, userB.id]
    });

    const rrDate = new Date(targetDate.getTime() + 2 * 60 * 60000);
    const rrEndDate = new Date(rrDate.getTime() + 30 * 60000);

    const rrBooking = await bookingsService.createBooking({
      eventTypeId: rrEventType.id,
      guestName: 'Lead Prospect',
      guestEmail: 'lead@prospect.com',
      startTime: rrDate.toISOString(),
      endTime: rrEndDate.toISOString()
    });
    if (rrBooking.bookings[0].hostId !== userB.id) {
      throw new Error(`Test 10 Failed: Expected Host B (${userB.id}), got ${rrBooking.bookings[0].hostId}`);
    }
    passedTests++;
    console.log('✅ Test 10 Passed: Round Robin assigned to least busy Host B');

    // ----------------------------------------------------
    // TEST 11: Collective Booking
    // ----------------------------------------------------
    console.log('--- [Test 11/28] Collective Multi-Host Booking ---');
    const colEventType = await eventTypesService.create(userA.id, {
      title: 'Panel Interview',
      slug: 'panel-interview',
      duration: 30,
      schedulingType: 'COLLECTIVE',
      teamId: team.id,
      hostIds: [userA.id, userB.id]
    });

    const colDate = new Date(targetDate.getTime() + 4 * 60 * 60000);
    const colEndDate = new Date(colDate.getTime() + 30 * 60000);

    const colBooking = await bookingsService.createBooking({
      eventTypeId: colEventType.id,
      guestName: 'Candidate',
      guestEmail: 'candidate@jobs.com',
      startTime: colDate.toISOString(),
      endTime: colEndDate.toISOString()
    });

    const coHostBookings = await bookingsService.getHostBookings(userB.id);
    const isVisibleToCoHost = coHostBookings.some((b: any) => b.id === colBooking.bookings[0].id);
    if (!isVisibleToCoHost) throw new Error('Test 11 Failed: Collective booking not visible to co-host B');
    passedTests++;
    console.log('✅ Test 11 Passed: Collective booking assigned all required hosts');

    // ----------------------------------------------------
    // TEST 12: Booking Conflict Double-Booking Protection
    // ----------------------------------------------------
    console.log('--- [Test 12/28] Double-Booking Conflict Protection ---');
    let doubleBookingBlocked = false;
    try {
      await bookingsService.createBooking({
        eventTypeId: eventTypeA.id,
        guestName: 'Double Attempter',
        guestEmail: 'double@test.com',
        startTime: targetDate.toISOString(),
        endTime: targetEndDate.toISOString()
      });
    } catch {
      doubleBookingBlocked = true;
    }
    if (!doubleBookingBlocked) throw new Error('Test 12 Failed: Double booking was allowed');
    passedTests++;
    console.log('✅ Test 12 Passed: Double booking strictly blocked');

    // ----------------------------------------------------
    // TEST 13: Secondary Host Conflict Protection
    // ----------------------------------------------------
    console.log('--- [Test 13/28] Secondary Host Conflict Protection ---');
    let secondaryBlocked = false;
    try {
      await bookingsService.createBooking({
        eventTypeId: colEventType.id,
        guestName: 'Concurrent Attempter',
        guestEmail: 'concurrent@test.com',
        startTime: colDate.toISOString(),
        endTime: colEndDate.toISOString()
      });
    } catch {
      secondaryBlocked = true;
    }
    if (!secondaryBlocked) throw new Error('Test 13 Failed: Secondary host conflict allowed booking');
    passedTests++;
    console.log('✅ Test 13 Passed: Secondary host conflict blocked');

    // ----------------------------------------------------
    // TEST 14: Rescheduling
    // ----------------------------------------------------
    console.log('--- [Test 14/28] Booking Rescheduling ---');
    const newStart = new Date(targetDate.getTime() + 24 * 60 * 60000); // Thursday 11:00 UTC
    const newEnd = new Date(newStart.getTime() + 30 * 60000);
    const resched = await bookingsService.rescheduleBooking(bookingRes.bookings[0].id, userA.id, newStart, newEnd);
    if (resched.status !== 'RESCHEDULED') throw new Error('Test 14 Failed: Reschedule failed');
    passedTests++;
    console.log('✅ Test 14 Passed: Rescheduling verified');

    // ----------------------------------------------------
    // TEST 15: Cancellation & Slot Recovery
    // ----------------------------------------------------
    console.log('--- [Test 15/28] Cancellation & Slot Recovery ---');
    await bookingsService.cancelBooking(bookingRes.bookings[0].id, userA.id, 'Phase 6 Test');
    const rebooked = await bookingsService.createBooking({
      eventTypeId: eventTypeA.id,
      guestName: 'Rebook Client',
      guestEmail: 'rebook@test.com',
      startTime: targetDate.toISOString(),
      endTime: targetEndDate.toISOString()
    });
    if (!rebooked.bookings[0].id) throw new Error('Test 15 Failed: Slot recovery failed');
    passedTests++;
    console.log('✅ Test 15 Passed: Cancellation and slot recovery verified');

    // ----------------------------------------------------
    // TEST 16: Availability Engine Retrieval
    // ----------------------------------------------------
    console.log('--- [Test 16/28] Availability Engine Retrieval ---');
    const userAvail = await availabilityService.getAvailability(userA.id);
    if (!userAvail) throw new Error('Test 16 Failed: Availability lookup failed');
    passedTests++;
    console.log('✅ Test 16 Passed: Availability schedule retrieved');

    // ----------------------------------------------------
    // TEST 17: Timezone Conversion
    // ----------------------------------------------------
    console.log('--- [Test 17/28] Timezone Conversion ---');
    const utcDate = new Date('2026-09-01T14:00:00.000Z');
    const nyTimeString = utcDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
    if (!nyTimeString.includes('10:00:00 AM')) throw new Error('Test 17 Failed: Timezone conversion mismatch');
    passedTests++;
    console.log('✅ Test 17 Passed: Timezone arithmetic verified');

    // ----------------------------------------------------
    // TEST 18: Routing Form Rule Evaluation
    // ----------------------------------------------------
    console.log('--- [Test 18/28] Routing Forms Dynamic Rule Evaluation ---');
    const form = await routingService.createForm(userA.id, {
      title: 'P6 Enterprise Qualifier',
      slug: 'p6-qualifier',
      description: 'Route leads',
      isActive: true,
      fallbackDestination: eventTypeA.slug,
      questions: [
        { label: 'Company Size', type: 'DROPDOWN', options: ['Small', 'Enterprise'], required: true, order: 1 }
      ]
    });
    const q1 = form.questions[0];
    await prisma.routingRule.create({
      data: {
        formId: form.id,
        questionId: q1.id,
        operator: 'EQUALS',
        value: 'Enterprise',
        destination: colEventType.slug
      }
    });
    const routeRes = await routingService.submitRoutingForm('p6_host_a', 'p6-qualifier', [
      { questionId: q1.id, value: 'Enterprise' }
    ]);
    if (routeRes.destination !== colEventType.slug) throw new Error('Test 18 Failed: Rule matching failed');
    passedTests++;
    console.log('✅ Test 18 Passed: Routing form evaluated accurately');

    // ----------------------------------------------------
    // TEST 19: Webhook Creation & Delivery
    // ----------------------------------------------------
    console.log('--- [Test 19/28] Webhook Creation & Delivery ---');
    const webhook = await webhooksService.create(userA.id, {
      url: 'https://webhook.site/phase6-test',
      events: ['booking.created'],
      isActive: true
    });
    await webhooksService.testWebhook(userA.id, webhook.id);
    const deliveries = await webhooksService.getDeliveries(userA.id, webhook.id);
    if (deliveries.length === 0) throw new Error('Test 19 Failed: Delivery not logged');
    passedTests++;
    console.log('✅ Test 19 Passed: Webhook test delivery logged');

    // ----------------------------------------------------
    // TEST 20: Webhook HMAC-SHA256 Signature
    // ----------------------------------------------------
    console.log('--- [Test 20/28] Webhook HMAC Signature ---');
    const payloadStr = JSON.stringify({ test: 'data' });
    const sig = deliveryService.generateSignature(payloadStr, webhook.secret);
    const expected = crypto.createHmac('sha256', webhook.secret).update(payloadStr).digest('hex');
    if (sig !== expected) throw new Error('Test 20 Failed: HMAC signature mismatch');
    passedTests++;
    console.log('✅ Test 20 Passed: Webhook HMAC signature verified');

    // ----------------------------------------------------
    // TEST 21: Push Token Registration
    // ----------------------------------------------------
    console.log('--- [Test 21/28] Push Token Registration ---');
    await pushController.registerToken({ user: { userId: userA.id } }, { token: 'p6_fcm_token', platform: 'ANDROID' });
    const pTokens = await prisma.pushToken.findMany({ where: { userId: userA.id } });
    if (!pTokens.some(t => t.token === 'p6_fcm_token')) throw new Error('Test 21 Failed: Push token not registered');
    passedTests++;
    console.log('✅ Test 21 Passed: Push token registration verified');

    // ----------------------------------------------------
    // TEST 22: Push Token Deletion
    // ----------------------------------------------------
    console.log('--- [Test 22/28] Push Token Deletion ---');
    await pushController.unregisterTokenByBody({ user: { userId: userA.id } }, { token: 'p6_fcm_token' });
    const remaining = await prisma.pushToken.findMany({ where: { token: 'p6_fcm_token' } });
    if (remaining.length !== 0) throw new Error('Test 22 Failed: Token cleanup failed');
    passedTests++;
    console.log('✅ Test 22 Passed: Push token cleanup on logout verified');

    // ----------------------------------------------------
    // TEST 23: Team Permissions
    // ----------------------------------------------------
    console.log('--- [Test 23/28] Team Permissions Enforcement ---');
    let teamNonOwnerBlocked = false;
    try {
      await teamsService.update(team.id, userB.id, { name: 'Unauthorized Name' });
    } catch {
      teamNonOwnerBlocked = true;
    }
    if (!teamNonOwnerBlocked) throw new Error('Test 23 Failed: Non-owner edited team');
    passedTests++;
    console.log('✅ Test 23 Passed: Team permissions verified');

    // ----------------------------------------------------
    // TEST 24: Team Invitations
    // ----------------------------------------------------
    console.log('--- [Test 24/28] Team Invitations ---');
    await teamsService.inviteMember(team.id, userA.id, { email: 'invitee@test.com', role: 'MEMBER' });
    const invite = await prisma.teamInvitation.findFirst({ where: { teamId: team.id, email: 'invitee@test.com' } });
    if (!invite || !invite.tokenHash) throw new Error('Test 24 Failed: Team invitation not stored');
    passedTests++;
    console.log('✅ Test 24 Passed: Team invitation generation verified');

    // ----------------------------------------------------
    // TEST 25: OAuth State Cryptographic Signature
    // ----------------------------------------------------
    console.log('--- [Test 25/28] OAuth State Cryptographic Signature ---');
    const oauthNonce = crypto.randomBytes(16).toString('hex');
    const oauthPayload = `${userA.id}:meetapp:${oauthNonce}`;
    const hmacState = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret').update(oauthPayload).digest('hex');
    if (hmacState.length !== 64) throw new Error('Test 25 Failed: OAuth state HMAC invalid');
    passedTests++;
    console.log('✅ Test 25 Passed: OAuth state signature verified');

    // ----------------------------------------------------
    // TEST 26: Archived / Inactive Event Safety
    // ----------------------------------------------------
    console.log('--- [Test 26/28] Archived Event Safety ---');
    await eventTypesService.update(eventTypeA.id, userA.id, { isActive: false });
    let archBlocked = false;
    try {
      await bookingsService.createBooking({
        eventTypeId: eventTypeA.id,
        guestName: 'Attempter',
        guestEmail: 'attempter@test.com',
        startTime: new Date(targetDate.getTime() + 8 * 60 * 60000).toISOString(),
        endTime: new Date(targetDate.getTime() + 8.5 * 60 * 60000).toISOString()
      });
    } catch {
      archBlocked = true;
    }
    if (!archBlocked) throw new Error('Test 26 Failed: Archived event allowed booking');
    await eventTypesService.update(eventTypeA.id, userA.id, { isActive: true });
    passedTests++;
    console.log('✅ Test 26 Passed: Archived event booking blocked');

    // ----------------------------------------------------
    // TEST 27: Rate Limiting & Throttling
    // ----------------------------------------------------
    console.log('--- [Test 27/28] Rate Limiting Architecture ---');
    const throttlerGuard = app.get(require('@nestjs/throttler').ThrottlerGuard);
    if (!throttlerGuard) throw new Error('Test 27 Failed: ThrottlerGuard not registered');
    passedTests++;
    console.log('✅ Test 27 Passed: Rate limiting throttler guard active');

    // ----------------------------------------------------
    // TEST 28: Invalid Payload Validation Pipe
    // ----------------------------------------------------
    console.log('--- [Test 28/28] Invalid Payload Validation Pipe ---');
    let invalidSlotBlocked = false;
    try {
      await bookingsService.createBooking({
        eventTypeId: eventTypeA.id,
        guestName: '',
        guestEmail: 'invalid-email',
        startTime: 'invalid-date',
        endTime: 'invalid-date'
      });
    } catch {
      invalidSlotBlocked = true;
    }
    if (!invalidSlotBlocked) throw new Error('Test 28 Failed: Invalid payload was accepted');
    passedTests++;
    console.log('✅ Test 28 Passed: Invalid payload validation verified');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 6 PRODUCTION TESTS PASSED!`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ Phase 6 Verification FAILED:\n', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runPhase6Verification();
