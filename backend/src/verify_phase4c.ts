import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { RoutingService } from './routing/routing.service';
import { BookingsService } from './bookings/bookings.service';
import { EventTypesService } from './event-types/event-types.service';
import { AvailabilityEngineService } from './availability/availability.engine';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const routingService = app.get(RoutingService);
  const bookingsService = app.get(BookingsService);
  const eventTypesService = app.get(EventTypesService);

  console.log('=== Starting Phase 4C Verification ===');

  try {
    // 1. Setup Test User and Event Type
    const testHost = await prisma.user.upsert({
      where: { email: 'test_phase4c@example.com' },
      update: {},
      create: {
        email: 'test_phase4c@example.com',
        passwordHash: 'dummy',
        profile: {
          create: { name: 'Test Phase 4C Host', username: 'test_phase4c', timezone: 'UTC' }
        }
      }
    });

    // Cleanup previous test data
    await prisma.booking.deleteMany({ where: { hostId: testHost.id } });
    await prisma.routingForm.deleteMany({ where: { userId: testHost.id } });
    await prisma.eventType.deleteMany({ where: { userId: testHost.id } });

    const availability = await prisma.availability.create({
      data: {
        userId: testHost.id,
        name: 'Default Test Schedule',
        isDefault: true,
        timezone: 'UTC',
        slots: {
          create: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
          ]
        }
      }
    });

    const eventType = await prisma.eventType.create({
      data: {
        userId: testHost.id,
        availabilityId: availability.id,
        title: 'Buffer Test Event',
        slug: 'buffer-test',
        duration: 30,
        bufferBefore: 15,
        bufferAfter: 15,
        isActive: true,
      }
    });

    const eventTypeDestination = await prisma.eventType.create({
      data: {
        userId: testHost.id,
        availabilityId: availability.id,
        title: 'Routing Destination',
        slug: 'routing-destination',
        duration: 30,
        isActive: true,
      }
    });

    console.log('✅ Setup complete');

    // 2. Test Routing Forms
    console.log('\n--- Testing Routing Forms ---');
    const form = await routingService.createForm(testHost.id, {
      title: 'Support Routing',
      slug: 'support-route',
      isActive: true,
      fallbackDestination: 'default-slug',
      questions: [
        { label: 'Issue Type', type: 'DROPDOWN', required: true, options: ['Billing', 'Technical'], order: 0 }
      ],
      rules: []
    });

    const formWithRules = await routingService.updateForm(form.id, testHost.id, {
      rules: [
        { questionId: form.questions[0].id, operator: 'EQUALS', value: 'Technical', destination: eventTypeDestination.slug }
      ]
    });

    // Valid Route submission
    const result = await routingService.submitRoutingForm(testHost.id, 'support-route', [
      { questionId: form.questions[0].id, value: 'Technical' }
    ]);
    if (result.destination === eventTypeDestination.slug) {
      console.log('✅ Routing form correctly evaluated rule and returned destination');
    } else {
      throw new Error(`Routing failed. Expected ${eventTypeDestination.slug}, got ${result.destination}`);
    }

    // Inactive Route submission
    await routingService.updateForm(form.id, testHost.id, { isActive: false });
    try {
      await routingService.submitRoutingForm(testHost.id, 'support-route', [
        { questionId: form.questions[0].id, value: 'Technical' }
      ]);
      throw new Error('Routing form should have blocked submission on inactive form');
    } catch (e: any) {
      if (e.message.includes('inactive')) {
        console.log('✅ Routing form blocked inactive submission');
      } else {
        throw e;
      }
    }

    // 3. Test Buffer Enforcement
    console.log('\n--- Testing Buffer Enforcement ---');
    
    // Create a base booking on a Wednesday to ensure it hits the availability
    const baseStart = new Date();
    baseStart.setUTCDate(baseStart.getUTCDate() + ((3 + 7 - baseStart.getUTCDay()) % 7 || 7));
    baseStart.setUTCHours(10, 0, 0, 0); // 10:00 AM UTC
    const baseEnd = new Date(baseStart.getTime() + 30 * 60000); // 10:30 AM UTC

    await prisma.booking.create({
      data: {
        hostId: testHost.id,
        eventTypeId: eventType.id,
        guestName: 'Base Guest',
        guestEmail: 'base@example.com',
        startTime: baseStart,
        endTime: baseEnd,
        status: 'CONFIRMED'
      }
    });

    // Attempt to book exactly at 10:30 AM (Should FAIL because of 15m bufferAfter on previous booking AND 15m bufferBefore on new booking)
    const nextStart = new Date(baseEnd.getTime());
    const nextEnd = new Date(nextStart.getTime() + 30 * 60000);

    try {
      await bookingsService.createBooking({
        hostId: testHost.id,
        eventTypeId: eventType.id,
        guestName: 'Overlap Guest',
        guestEmail: 'overlap@example.com',
        startTime: nextStart.toISOString(),
        endTime: nextEnd.toISOString(),
        answers: []
      });
      throw new Error('Booking should have failed due to buffer overlap');
    } catch (e: any) {
      if (e.message.includes('Time slot is no longer available') || e.message.includes('Host is already booked')) {
         console.log('✅ Buffer enforcement successfully blocked back-to-back booking');
      } else {
         throw e;
      }
    }

    // 4. Rate Limiting Check
    console.log('\n--- Testing Throttling Structure ---');
    const appModuleContents = await require('fs').promises.readFile(__dirname + '/app.module.ts', 'utf-8');
    if (appModuleContents.includes('ThrottlerGuard') && appModuleContents.includes('APP_GUARD')) {
      console.log('✅ Global ThrottlerGuard is configured in AppModule');
    } else {
      throw new Error('ThrottlerGuard not found in AppModule');
    }

    console.log('\n=== All Phase 4C Verifications Passed! ===\n');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
