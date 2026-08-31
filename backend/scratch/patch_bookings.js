const fs = require('fs');
const file = 'src/bookings/bookings.service.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add date-fns-tz import
content = content.replace(
  "import { PrismaService }",
  "import { toZonedTime, fromZonedTime } from 'date-fns-tz';\nimport { PrismaService }"
);

// 2. Add calculateOccurrences method
const calculateOccurrences = `  private calculateOccurrences(startTimeIso: string, endTimeIso: string, timezone: string, recurrence: any, maxOccurrences: number) {
    const start = new Date(startTimeIso);
    const end = new Date(endTimeIso);
    const durationMs = end.getTime() - start.getTime();

    const zonedStart = toZonedTime(start, timezone);
    const occurrences = [];

    const limit = Math.min(recurrence.count, maxOccurrences || 10);
    
    for (let i = 0; i < limit; i++) {
      let nextZoned = new Date(zonedStart.getTime());
      
      if (i > 0) {
        if (recurrence.frequency === 'DAILY') {
          nextZoned.setDate(zonedStart.getDate() + (i * recurrence.interval));
        } else if (recurrence.frequency === 'WEEKLY') {
          nextZoned.setDate(zonedStart.getDate() + (i * recurrence.interval * 7));
        } else if (recurrence.frequency === 'MONTHLY') {
          nextZoned.setMonth(zonedStart.getMonth() + (i * recurrence.interval));
        }
      }

      const nextUtcStart = fromZonedTime(nextZoned, timezone);
      const nextUtcEnd = new Date(nextUtcStart.getTime() + durationMs);
      
      occurrences.push({ startTime: nextUtcStart, endTime: nextUtcEnd, occurrenceNumber: i + 1 });
    }

    return occurrences;
  }

`;
content = content.replace("async createBooking(dto: CreateBookingDto) {", calculateOccurrences + "  async createBooking(dto: CreateBookingDto) {");

// 3. Update host lookup
content = content.replace(
  "const host = await this.prisma.user.findUnique({ where: { id: dto.hostId } });\n    if (!host) {\n      throw new BadRequestException('Host not found');\n    }\n    const currentVersion = host.bookingVersion;",
  `const host = await this.prisma.user.findUnique({ 
      where: { id: dto.hostId },
      include: { profile: true }
    });
    if (!host) {
      throw new BadRequestException('Host not found');
    }
    const currentVersion = host.bookingVersion;
    const timezone = host.profile?.timezone || 'UTC';`
);

// 4. Extract everything from `let booking;` to the end of `createBooking` and replace it
const oldTailStart = '    let booking;';
const oldTailEnd = '    return updatedBooking;\n  }';
const startIndex = content.indexOf(oldTailStart);
const endIndex = content.indexOf(oldTailEnd) + oldTailEnd.length;

if (startIndex === -1 || endIndex < startIndex) {
    console.error("Could not find replacement anchors");
    process.exit(1);
}

const newTail = `    let occurrencesToAttempt = [{ startTime: new Date(dto.startTime), endTime: new Date(dto.endTime), occurrenceNumber: 1 }];

    if (dto.recurrence && eventType.allowRecurring) {
       occurrencesToAttempt = this.calculateOccurrences(
          dto.startTime, 
          dto.endTime, 
          timezone, 
          dto.recurrence, 
          eventType.recurringMaxOccurrences || 10
       );
    } else if (dto.recurrence && !eventType.allowRecurring) {
       throw new BadRequestException('This event type does not allow recurring bookings.');
    }

    let transactionResult;
    try {
      transactionResult = await this.prisma.$transaction(async (tx) => {
        // Optimistic Concurrency Control (OCC)
        await tx.user.update({
          where: { 
            id: dto.hostId,
            bookingVersion: currentVersion 
          },
          data: {
            bookingVersion: { increment: 1 }
          }
        });

        let seriesId = undefined;
        if (dto.recurrence && eventType.allowRecurring) {
           const series = await tx.bookingSeries.create({
             data: {
               hostId: dto.hostId,
               eventTypeId: dto.eventTypeId,
               frequency: dto.recurrence.frequency,
               interval: dto.recurrence.interval,
               count: occurrencesToAttempt.length,
               timezone: timezone
             }
           });
           seriesId = series.id;
        }

        const successfulOccurrences = [];
        const skippedOccurrences = [];

        for (const occ of occurrencesToAttempt) {
           let isAvailable = true;
           let skipReason = '';

           if (eventType.isGroupEvent) {
             const existingBookingsCount = await tx.booking.count({
               where: {
                 eventTypeId: dto.eventTypeId,
                 status: 'CONFIRMED',
                 startTime: occ.startTime,
                 endTime: occ.endTime,
               }
             });

             if (existingBookingsCount >= eventType.maxInvitees) {
               isAvailable = false;
               skipReason = 'Group event slot is full';
             }

             if (isAvailable) {
               const otherOverlapping = await tx.booking.findFirst({
                 where: {
                   hostId: dto.hostId,
                   status: 'CONFIRMED',
                   eventTypeId: { not: dto.eventTypeId },
                   OR: [
                     {
                       startTime: { lt: occ.endTime },
                       endTime: { gt: occ.startTime },
                     }
                   ]
                 }
               });
               if (otherOverlapping) {
                 isAvailable = false;
                 skipReason = 'Host is busy with another event';
               }
             }
           } else {
             const overlappingBooking = await tx.booking.findFirst({
               where: {
                 hostId: dto.hostId,
                 status: 'CONFIRMED',
                 OR: [
                   {
                     startTime: { lt: occ.endTime },
                     endTime: { gt: occ.startTime },
                   }
                 ]
               }
             });

             if (overlappingBooking) {
               isAvailable = false;
               skipReason = 'Time slot is no longer available';
             }
           }

           if (!isAvailable) {
              skippedOccurrences.push({ ...occ, reason: skipReason });
              continue;
           }

           const booking = await tx.booking.create({
             data: {
               hostId: dto.hostId,
               eventTypeId: dto.eventTypeId,
               guestName: dto.guestName,
               guestEmail: dto.guestEmail,
               guestPhone: dto.guestPhone,
               guestCompany: dto.guestCompany,
               guestNotes: dto.guestNotes,
               startTime: occ.startTime,
               endTime: occ.endTime,
               status: 'CONFIRMED',
               bookingSeriesId: seriesId,
               seriesOccurrenceNumber: occ.occurrenceNumber,
               answers: {
                 create: dbAnswers
               }
             },
             include: {
               eventType: true,
               host: {
                 include: {
                   profile: true,
                 }
               }
             }
           });
           
           successfulOccurrences.push(booking);
        }

        if (successfulOccurrences.length === 0) {
           throw new BadRequestException('All requested time slots are unavailable.');
        }

        return { successfulOccurrences, skippedOccurrences, seriesId };
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ConflictException('Concurrent booking detected. Please try again.');
      }
      throw error;
    }

    const successful = transactionResult.successfulOccurrences;
    const integrationResults = [];

    for (const booking of successful) {
      let calendarResult;
      try {
        calendarResult = await this.calendarService.createCalendarEvent(
          dto.hostId,
          booking.host.email,
          booking.guestEmail,
          booking.startTime.toISOString(),
          booking.endTime.toISOString(),
          booking.eventType.title
        );
        
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { 
            meetLink: calendarResult?.meetLink,
            externalEventId: calendarResult?.eventId, 
          }
        });

        integrationResults.push({ bookingId: booking.id, success: true });
        
        await this.emailService.sendBookingConfirmation(
          booking.guestEmail,
          booking.guestName,
          booking.eventType.title,
          booking.startTime.toISOString(),
          calendarResult?.meetLink || ''
        );

        await this.slackService.sendBookingNotification(
          dto.hostId,
          dto.guestName,
          dto.guestEmail,
          booking.startTime.toISOString(),
          booking.eventType.title
        );
      } catch (error) {
        await this.prisma.booking.delete({ where: { id: booking.id } });
        transactionResult.skippedOccurrences.push({
           startTime: booking.startTime,
           endTime: booking.endTime,
           occurrenceNumber: booking.seriesOccurrenceNumber,
           reason: 'External calendar integration failed'
        });
      }
    }

    if (successful.length > 0) {
      await this.contactsService.createOrUpdateContact(
        dto.hostId,
        dto.guestName,
        dto.guestEmail,
        dto.guestPhone,
        dto.guestCompany,
        new Date(dto.startTime)
      );
    }

    const finalBooked = successful.filter(b => integrationResults.some(i => i.bookingId === b.id));

    if (finalBooked.length === 0) {
      throw new BadRequestException('All requested time slots failed during integration.');
    }

    if (!dto.recurrence) {
      return finalBooked[0];
    }
    
    return {
      seriesId: transactionResult.seriesId,
      requested: occurrencesToAttempt.length,
      booked: finalBooked.length,
      skipped: transactionResult.skippedOccurrences,
      bookings: finalBooked
    };
  }`;

content = content.substring(0, startIndex) + newTail + content.substring(endIndex);
fs.writeFileSync(file, content);
console.log('Successfully patched bookings.service.ts');
