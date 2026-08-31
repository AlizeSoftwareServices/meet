import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BookingsService } from '../src/bookings/bookings.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AvailabilityEngineService } from '../src/availability/availability.engine';
import { CronService } from '../src/integrations/cron.service';
import { SecureTokenService, TokenType } from '../src/auth/secure-token.service';
import { EmailService } from '../src/integrations/email.service';
import { addDays, addMinutes } from 'date-fns';

async function bootstrap() {
  console.log('--- STARTING PHASE 3C VERIFICATION ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const prisma = app.get(PrismaService);
  const bookingsService = app.get(BookingsService);
  const secureTokenService = app.get(SecureTokenService);
  const emailService = app.get(EmailService);

  // Mock EmailService to prevent SMTP hanging in tests
  emailService.sendBookingConfirmation = async () => ({ success: true, messageId: 'mock' });
  emailService.sendCancellationEmail = async () => ({ success: true, messageId: 'mock' });
  emailService.sendRescheduleEmail = async () => ({ success: true, messageId: 'mock' });
  emailService.sendReminderEmail = async () => ({ success: true, messageId: 'mock' });

  // Setup Test Data
  console.log('Setting up test data...');
  let user = await prisma.user.findFirst({ where: { email: 'phase3c_test@example.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'phase3c_test@example.com',
        passwordHash: 'hashed',
        profile: { create: { name: 'Test Host', username: 'test-host-phase3c', timezone: 'Asia/Kolkata' } } // TEST D: Host timezone
      }
    });
  }

  const availability = await prisma.availability.create({
    data: {
      userId: user.id,
      name: 'Default Working Hours',
      isDefault: true,
      timezone: 'Asia/Kolkata',
      slots: {
        create: [
          { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },
        ]
      }
    }
  });

  // Clear previous test events and bookings
  await prisma.eventType.deleteMany({ where: { userId: user.id } });
  await prisma.booking.deleteMany({ where: { hostId: user.id } });
  await prisma.workflowExecution.deleteMany({});

  const eventA = await prisma.eventType.create({
    data: {
      userId: user.id,
      title: 'Event A',
      slug: 'event-a',
      duration: 30,
      maxDailyBookings: 2, // TEST A: maxDailyBookings = 2
      allowRecurring: true,
      availabilityId: availability.id
    }
  });

  const eventB = await prisma.eventType.create({
    data: {
      userId: user.id,
      title: 'Event B',
      slug: 'event-b',
      duration: 30,
      maxDailyBookings: 1, // TEST C: Different event types are independent
      availabilityId: availability.id
    }
  });

  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(10, 0, 0, 0);

  // TEST A: Max Daily Bookings = 2
  console.log('\nRunning TEST A & B: Max Daily Bookings (Limit = 2)');
  const b1 = await bookingsService.createBooking({
    hostId: user.id,
    eventTypeId: eventA.id,
    startTime: tomorrow.toISOString(),
    endTime: addMinutes(tomorrow, 30).toISOString(),
    guestName: 'Guest 1',
    guestEmail: 'g1@example.com',
    answers: []
  });
  console.log('Booking 1: SUCCESS');

  const b2 = await bookingsService.createBooking({
    hostId: user.id,
    eventTypeId: eventA.id,
    startTime: addMinutes(tomorrow, 60).toISOString(),
    endTime: addMinutes(tomorrow, 90).toISOString(),
    guestName: 'Guest 2',
    guestEmail: 'g2@example.com',
    answers: []
  });
  console.log('Booking 2: SUCCESS');

  try {
    await bookingsService.createBooking({
      hostId: user.id,
      eventTypeId: eventA.id,
      startTime: addMinutes(tomorrow, 120).toISOString(),
      endTime: addMinutes(tomorrow, 150).toISOString(),
      guestName: 'Guest 3',
      guestEmail: 'g3@example.com',
      answers: []
    });
    console.error('TEST A FAILED: Booking 3 should have been rejected');
  } catch (e: any) {
    if (e.message.includes('No available slots')) {
      console.log('Booking 3: REJECTED (Expected)');
    } else {
      console.error('TEST A FAILED: Unexpected error', e.message);
    }
  }

  // TEST B: Cancelled booking does not consume limit
  await bookingsService.cancelBooking((b1 as any).bookings ? (b1 as any).bookings[0].id : (b1 as any).id, user.id, 'Test Cancel');
  console.log('Booking 1 cancelled.');

  try {
    const b3 = await bookingsService.createBooking({
      hostId: user.id,
      eventTypeId: eventA.id,
      startTime: addMinutes(tomorrow, 120).toISOString(),
      endTime: addMinutes(tomorrow, 150).toISOString(),
      guestName: 'Guest 3 Retry',
      guestEmail: 'g3@example.com',
      answers: []
    });
    console.log('Booking 3 Retry: SUCCESS (Limit freed)');
  } catch (e: any) {
    console.error('TEST B FAILED: Booking 3 should have succeeded after cancellation', e.message);
  }

  // TEST C: Different event types are independent
  console.log('\nRunning TEST C: Different event types');
  try {
    await bookingsService.createBooking({
      hostId: user.id,
      eventTypeId: eventB.id,
      startTime: addMinutes(tomorrow, 180).toISOString(),
      endTime: addMinutes(tomorrow, 210).toISOString(),
      guestName: 'Guest B',
      guestEmail: 'gb@example.com',
      answers: []
    });
    console.log('Booking B1: SUCCESS');
  } catch (e) {
    console.error('TEST C FAILED');
  }

  try {
    await bookingsService.createBooking({
      hostId: user.id,
      eventTypeId: eventB.id,
      startTime: addMinutes(tomorrow, 240).toISOString(),
      endTime: addMinutes(tomorrow, 270).toISOString(),
      guestName: 'Guest B2',
      guestEmail: 'gb2@example.com',
      answers: []
    });
    console.error('TEST C FAILED: Booking B2 should be rejected');
  } catch (e: any) {
    console.log('Booking B2: REJECTED (Expected)');
  }

  // TEST E & F: Recurring daily limit & Series cancellation
  console.log('\nRunning TEST E & F: Recurring Series & Cancellation');
  const dayAfter = addDays(tomorrow, 1);
  const seriesBooking = await bookingsService.createBooking({
    hostId: user.id,
    eventTypeId: eventA.id,
    startTime: dayAfter.toISOString(),
    endTime: addMinutes(dayAfter, 30).toISOString(),
    guestName: 'Recurring Guest',
    guestEmail: 'req@example.com',
    answers: [],
    recurrence: { frequency: 'DAILY', interval: 1, count: 3 }
  });

  const seriesId = (seriesBooking as any).seriesId;
  console.log('Series created with ID:', seriesId);

  await bookingsService.cancelSeries(seriesId, user.id, 'Test Series Cancel');
  
  const futureBookings = await prisma.booking.findMany({
    where: { bookingSeriesId: seriesId }
  });
  const allCancelled = futureBookings.every(b => b.status === 'CANCELLED');
  if (allCancelled && futureBookings.length > 0) {
    console.log('Series Cancellation: SUCCESS (All future occurrences cancelled)');
  } else {
    console.error('TEST F FAILED: Not all occurrences cancelled');
  }

  // TEST G: Unauthorized series cancellation
  console.log('\nRunning TEST G: Unauthorized Series Cancellation');
  try {
    await bookingsService.cancelSeries(seriesId, 'some-other-host-id', 'Malicious');
    console.error('TEST G FAILED: Should have rejected unauthorized cancel');
  } catch (e: any) {
    console.log('Unauthorized Cancel: REJECTED (Expected)');
  }

  // TEST H: Workflow deduplication
  console.log('\nRunning TEST H: Workflow Deduplication');
  const workflow = await prisma.workflow.create({
    data: {
      eventTypeId: eventA.id,
      triggerType: 'BEFORE_EVENT',
      timeOffset: 60,
      actionType: 'EMAIL'
    }
  });

  const testBooking = await prisma.booking.findFirst({ where: { hostId: user.id } });
  if (testBooking) {
    await prisma.workflowExecution.create({
      data: {
        bookingId: testBooking.id,
        workflowId: workflow.id,
      }
    });
    console.log('First execution: SUCCESS');

    try {
      await prisma.workflowExecution.create({
        data: {
          bookingId: testBooking.id,
          workflowId: workflow.id,
        }
      });
      console.error('TEST H FAILED: Duplicate execution succeeded');
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log('Second execution: BLOCKED by P2002 (Expected)');
      } else {
        console.error('TEST H FAILED: Unexpected error', e);
      }
    }
  }

  // TEST I & J: Guest token security
  console.log('\nRunning TEST I & J: Guest Token Security');
  const token = await secureTokenService.generateToken(TokenType.GUEST_CANCEL, 1, user.id, testBooking?.id);
  
  const tokenRecord = await secureTokenService.verifyAndConsumeToken(token, TokenType.GUEST_CANCEL);
  if (tokenRecord) {
    console.log('Token validation 1: SUCCESS');
  } else {
    console.error('TEST I FAILED: Token should be valid');
  }

  const tokenRecord2 = await secureTokenService.verifyAndConsumeToken(token, TokenType.GUEST_CANCEL);
  if (!tokenRecord2) {
    console.log('Token validation 2 (Reuse): REJECTED (Expected)');
  } else {
    console.error('TEST I FAILED: Token reuse succeeded');
  }

  console.log('\n--- VERIFICATION COMPLETE ---');
  await app.close();
}

bootstrap().catch(console.error);
