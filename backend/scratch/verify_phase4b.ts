import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BookingsService } from '../src/bookings/bookings.service';
import { PublicService } from '../src/public/public.service';
import { PollsService } from '../src/polls/polls.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { addDays, format, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

async function bootstrap() {
  console.log('--- Phase 4B Verification Started ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const prisma = app.get(PrismaService);
  const bookingsService = app.get(BookingsService);
  const publicService = app.get(PublicService);
  const pollsService = app.get(PollsService);

  // Seed User and Event Type for testing
  const email = `test4b_${Date.now()}@example.com`;
  const host = await prisma.user.create({
    data: {
      email,
      isVerified: true,
      profile: {
        create: {
          username: `host4b_${Date.now()}`,
          name: 'Host 4B',
          timezone: 'America/New_York'
        }
      },
      availabilities: {
        create: {
          name: 'Test Availability',
          isDefault: true,
          timezone: 'America/New_York',
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
      }
    },
    include: { profile: true, availabilities: true }
  });

  const eventType = await prisma.eventType.create({
    data: {
      userId: host.id,
      title: '4B Test Event',
      slug: '4b-test',
      duration: 30,
      isActive: true,
      availabilityId: host.availabilities[0].id,
      maxAdvanceDays: 30,
      allowRecurring: true
    }
  });

  console.log(`\nSetup complete. Host ID: ${host.id}, EventType ID: ${eventType.id}`);

  try {
    // --- Test A: Timezone Correctness ---
    console.log('\n--- Test A: Timezone Correctness ---');
    const guestTimezone = 'Asia/Tokyo'; // Tokyo is +13/+14 hours ahead of NY
    
    // Pick a date 3 days from now
    const testDate = addDays(new Date(), 3);
    const tokyoZoned = toZonedTime(testDate, guestTimezone);
    const dateStr = format(tokyoZoned, 'yyyy-MM-dd');
    
    console.log(`Requesting availability for Tokyo Date: ${dateStr}`);
    const slots = await publicService.getAvailableSlots(host.profile!.username!, eventType.slug, dateStr, guestTimezone);
    console.log(`Returned slots length: ${slots.length}`);
    if (slots.length > 0) {
      console.log('Test A: Passed (Slots returned across timezones)');
    } else {
      console.warn('Test A: Failed (No slots returned, ensure it is a weekday in host timezone)');
    }

    // --- Test B: Max Advance Days ---
    console.log('\n--- Test B: Max Advance Days ---');
    const advanceDate = addDays(new Date(), 35);
    const advanceDateStr = format(advanceDate, 'yyyy-MM-dd');
    console.log(`Requesting availability for 35 days in advance (Max is 30)`);
    const advanceSlots = await publicService.getAvailableSlots(host.profile!.username!, eventType.slug, advanceDateStr, 'America/New_York');
    if (advanceSlots.length === 0) {
      console.log('Test B: Passed (Boundary respected)');
    } else {
      console.error('Test B: Failed (Slots returned beyond boundary)');
    }

    // --- Test D: Concurrent Booking ---
    console.log('\n--- Test D: Concurrent Booking ---');
    
    // Find a valid slot first
    let slotReqDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    let validSlots = await publicService.getAvailableSlots(host.profile!.username!, eventType.slug, slotReqDateStr, 'America/New_York');
    
    if (validSlots.length === 0) {
       // try day 2
       slotReqDateStr = format(addDays(new Date(), 2), 'yyyy-MM-dd');
       validSlots = await publicService.getAvailableSlots(host.profile!.username!, eventType.slug, slotReqDateStr, 'America/New_York');
    }
    
    if (validSlots.length > 0) {
      const slot = validSlots[0];
      console.log(`Attempting concurrent booking for slot: ${slot.startTime}`);
      
      const payload1 = {
        hostId: host.id,
        eventTypeId: eventType.id,
        guestName: 'Guest 1',
        guestEmail: 'g1@example.com',
        startTime: slot.startTime,
        endTime: slot.endTime
      };
      
      const payload2 = {
        hostId: host.id,
        eventTypeId: eventType.id,
        guestName: 'Guest 2',
        guestEmail: 'g2@example.com',
        startTime: slot.startTime,
        endTime: slot.endTime
      };

      const results = await Promise.allSettled([
        bookingsService.createBooking(payload1),
        bookingsService.createBooking(payload2)
      ]);

      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      console.log(`Successes: ${successes.length}, Failures: ${failures.length}`);
      if (successes.length === 1 && failures.length === 1) {
         console.log('Test D: Passed (Atomic conflict protection works)');
      } else {
         console.error('Test D: Failed (Concurrency violated)');
      }
    } else {
       console.log('Test D: Skipped (No valid slots found)');
    }

    // --- Test F: Poll Vote Race ---
    console.log('\n--- Test F: Poll Vote Race ---');
    const poll = await pollsService.createPoll(host.id, {
      title: 'Concurrency Poll',
      description: 'Test',
      duration: 30,
      slots: [{ startTime: new Date().toISOString(), endTime: addDays(new Date(), 1).toISOString() }]
    });

    const pollSlotId = poll.slots[0].id;
    
    const votePayload = {
      pollSlotId,
      guestName: 'Voter 1',
      guestEmail: 'voter1@example.com',
      status: 'YES'
    };

    const voteResults = await Promise.allSettled([
      pollsService.vote(poll.id, votePayload),
      pollsService.vote(poll.id, votePayload)
    ]);

    const vSuccesses = voteResults.filter(r => r.status === 'fulfilled');
    const vFailures = voteResults.filter(r => r.status === 'rejected');

    console.log(`Poll Vote Successes: ${vSuccesses.length}, Failures: ${vFailures.length}`);
    if (vSuccesses.length === 1 && vFailures.length === 1) {
       console.log('Test F: Passed (Poll concurrency protected)');
    } else {
       console.error('Test F: Failed (Concurrency violated)');
    }

  } catch (error) {
    console.error('Test script encountered an error:', error);
  } finally {
    // Cleanup
    await prisma.user.delete({ where: { id: host.id } });
    await app.close();
    console.log('\n--- Phase 4B Verification Complete ---');
  }
}

bootstrap();
