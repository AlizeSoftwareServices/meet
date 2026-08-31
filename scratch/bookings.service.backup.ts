import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { EmailService } from '../integrations/email.service';
import { CalendarService } from '../integrations/calendar.service';
import { SlackService } from '../integrations/slack.service';
import { ContactsService } from '../contacts/contacts.service';
import { AvailabilityEngineService } from '../availability/availability.engine';
import { SecureTokenService, TokenType } from '../auth/secure-token.service';
import { PushNotificationService } from '../integrations/push.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private calendarService: CalendarService,
    private slackService: SlackService,
    private contactsService: ContactsService,
    private availabilityEngine: AvailabilityEngineService,
    private secureTokenService: SecureTokenService,
    private pushService: PushNotificationService,
  ) {}

    private calculateOccurrences(startTimeIso: string, endTimeIso: string, timezone: string, recurrence: any, maxOccurrences: number) {
    const start = new Date(startTimeIso);
    const end = new Date(endTimeIso);
    const durationMs = end.getTime() - start.getTime();

    const zonedStart = toZonedTime(start, timezone);
    const occurrences: { startTime: Date; endTime: Date; occurrenceNumber: number; }[] = [];

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

  async createBooking(dto: CreateBookingDto) {
    // 1. Fetch Event Type
    const eventType = await this.prisma.eventType.findUnique({
      where: { id: dto.eventTypeId },
      include: { customQuestions: true }
    });

    if (!eventType) {
      throw new BadRequestException('Event type not found');
    }

    if (dto.singleUseToken) {
      const link = await this.prisma.singleUseLink.findUnique({
        where: { tokenHash: dto.singleUseToken }
      });
      if (!link) {
        throw new BadRequestException('Invalid single-use link token');
      }
      if (link.used) {
        throw new BadRequestException('This single-use link has already been used');
      }
      if (link.expiresAt && link.expiresAt < new Date()) {
        throw new BadRequestException('This single-use link has expired');
      }
      if (link.eventTypeId !== dto.eventTypeId) {
        throw new BadRequestException('Token is not valid for this event type');
      }
    }

    const host = await this.prisma.user.findUnique({ 
      where: { id: dto.hostId },
      include: { profile: true }
    });
    if (!host) {
      throw new BadRequestException('Host not found');
    }
    const currentVersion = host.bookingVersion;
    const timezone = host.profile?.timezone || 'UTC';

    let dbAnswers: { customQuestionId: string; questionLabel: string; value: string }[] = [];
    if (eventType.customQuestions && eventType.customQuestions.length > 0) {
      const answersMap = new Map<string, string>();
      const submittedIds = new Set<string>();

      if (dto.answers) {
        for (const ans of dto.answers) {
          if (submittedIds.has(ans.questionId)) {
             throw new BadRequestException(`Duplicate answer submitted for question ${ans.questionId}`);
          }
          submittedIds.add(ans.questionId);
          answersMap.set(ans.questionId, ans.value);
        }
      }

      const validQuestionIds = new Set(eventType.customQuestions.map(q => q.id));
      for (const id of submittedIds) {
        if (!validQuestionIds.has(id)) {
           throw new BadRequestException(`Unknown questionId submitted: ${id}`);
        }
      }

      for (const q of eventType.customQuestions) {
        const val = answersMap.get(q.id);
        const hasValue = val !== undefined && val !== null && val.trim() !== '';

        if (q.required && !hasValue) {
           throw new BadRequestException(`Question "${q.label}" is required.`);
        }

        if (hasValue) {
           if ((q.type === 'DROPDOWN' || q.type === 'MULTIPLE_CHOICE') && !q.options.includes(val)) {
              try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) {
                  for (const p of parsed) {
                    if (!q.options.includes(p)) {
                      throw new BadRequestException(`Invalid option "${p}" for question "${q.label}"`);
                    }
                  }
                } else {
                  throw new BadRequestException(`Invalid option "${val}" for question "${q.label}"`);
                }
              } catch (e) {
                if (e instanceof BadRequestException) throw e;
                throw new BadRequestException(`Invalid option "${val}" for question "${q.label}"`);
              }
           } else if (q.type === 'NUMBER') {
              if (isNaN(Number(val))) {
                 throw new BadRequestException(`Question "${q.label}" must be a valid number.`);
              }
           } else if (q.type === 'PHONE') {
              if (!/^\+?[0-9\s\-\(\)]+$/.test(val)) {
                 throw new BadRequestException(`Question "${q.label}" must be a valid phone number.`);
              }
           }
           
           dbAnswers.push({
             customQuestionId: q.id,
             questionLabel: q.label,
             value: val,
           });
        }
      }
    } else if (dto.answers && dto.answers.length > 0) {
       throw new BadRequestException(`This event type does not accept custom answers.`);
    }

    let occurrencesToAttempt = [{ startTime: new Date(dto.startTime), endTime: new Date(dto.endTime), occurrenceNumber: 1 }];

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
      // 1. Evaluate availability of all requested slots using unified engine BEFORE transaction
      const evaluatedOccurrences = await this.availabilityEngine.evaluateSlots(
        dto.hostId, 
        dto.eventTypeId, 
        occurrencesToAttempt
      );

      // If it's a single booking and it's invalid, throw immediately
      if (!dto.recurrence) {
        const singleResult = evaluatedOccurrences[0];
        if (!singleResult.isAvailable) {
          throw new BadRequestException(singleResult.reason || 'Time slot is no longer available');
        }
      }

      // If it's recurring and NO slots are available, throw immediately
      if (dto.recurrence && evaluatedOccurrences.every(o => !o.isAvailable)) {
         throw new BadRequestException('All requested occurrences are unavailable or blocked.');
      }

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

        let seriesId: string | undefined = undefined;
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

        const successfulOccurrences: any[] = [];
        const skippedOccurrences: any[] = [];

        for (const occ of evaluatedOccurrences) {
           if (!occ.isAvailable) {
              skippedOccurrences.push({ ...occ, reason: occ.reason });
              continue;
           }
           const occBufferBefore = eventType.bufferBefore || 0;
           const occBufferAfter = eventType.bufferAfter || 0;
           const effectiveOccStart = new Date(occ.startTime.getTime() - occBufferBefore * 60000);
           const effectiveOccEnd = new Date(occ.endTime.getTime() + occBufferAfter * 60000);
           
           if (!eventType.isGroupEvent) {
             const potentialOverlaps = await tx.booking.findMany({
               where: {
                 hostId: dto.hostId,
                 status: { in: ['CONFIRMED', 'RESCHEDULED'] },
                 startTime: { gte: new Date(effectiveOccStart.getTime() - 24 * 60 * 60 * 1000) },
                 endTime: { lte: new Date(effectiveOccEnd.getTime() + 24 * 60 * 60 * 1000) }
               },
               include: { eventType: true }
             });

             const overlapping = potentialOverlaps.find(b => {
               const bBufferBefore = b.eventType?.bufferBefore || 0;
               const bBufferAfter = b.eventType?.bufferAfter || 0;
               const bStart = new Date(b.startTime.getTime() - bBufferBefore * 60000);
               const bEnd = new Date(b.endTime.getTime() + bBufferAfter * 60000);
               return bStart.getTime() < effectiveOccEnd.getTime() && bEnd.getTime() > effectiveOccStart.getTime();
             });
             
             if (overlapping) {
               throw new ConflictException('Time slot is no longer available. It was booked concurrently.');
             }
           } else {
             const groupBookingsCount = await tx.booking.count({
               where: {
                 hostId: dto.hostId,
                 eventTypeId: dto.eventTypeId,
                 status: { in: ['CONFIRMED', 'RESCHEDULED'] },
                 startTime: occ.startTime,
                 endTime: occ.endTime
               }
             });
             if (groupBookingsCount >= eventType.maxInvitees) {
                throw new ConflictException('Group event time slot is fully booked.');
             }
             
             const potentialOtherOverlaps = await tx.booking.findMany({
               where: {
                 hostId: dto.hostId,
                 eventTypeId: { not: dto.eventTypeId },
                 status: { in: ['CONFIRMED', 'RESCHEDULED'] },
                 startTime: { gte: new Date(effectiveOccStart.getTime() - 24 * 60 * 60 * 1000) },
                 endTime: { lte: new Date(effectiveOccEnd.getTime() + 24 * 60 * 60 * 1000) }
               },
               include: { eventType: true }
             });
             
             const otherEventOverlap = potentialOtherOverlaps.find(b => {
               const bBufferBefore = b.eventType?.bufferBefore || 0;
               const bBufferAfter = b.eventType?.bufferAfter || 0;
               const bStart = new Date(b.startTime.getTime() - bBufferBefore * 60000);
               const bEnd = new Date(b.endTime.getTime() + bBufferAfter * 60000);
               return bStart.getTime() < effectiveOccEnd.getTime() && bEnd.getTime() > effectiveOccStart.getTime();
             });
             if (otherEventOverlap) {
                throw new ConflictException('Host is busy with another event.');
             }
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

        if (dto.singleUseToken) {
           await tx.singleUseLink.update({
             where: { tokenHash: dto.singleUseToken },
             data: { used: true }
           });
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
    const integrationResults: { bookingId: string; success: boolean; }[] = [];
    let confirmationToken = '';

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
      } catch (error: any) {
        this.logger.error(`Failed to create external calendar event for booking ${booking.id}: ${error.message}`);
        // Do not delete the booking. We gracefully degrade to no external calendar event.
      }

      try {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { 
            meetLink: calendarResult?.meetLink,
            externalEventId: calendarResult?.eventId, 
          }
        });

        integrationResults.push({ bookingId: booking.id, success: true });
        
        const cancelToken = await this.secureTokenService.generateToken(TokenType.GUEST_CANCEL, 168, booking.hostId, booking.id);
        const rescheduleToken = await this.secureTokenService.generateToken(TokenType.GUEST_RESCHEDULE, 168, booking.hostId, booking.id);
        confirmationToken = await this.secureTokenService.generateToken(TokenType.BOOKING_CONFIRMATION, 8760, booking.hostId, booking.id);

        await this.emailService.sendBookingConfirmation(
          booking.guestEmail,
          booking.guestName,
          booking.eventType.title,
          booking.startTime.toISOString(),
          calendarResult?.meetLink || '',
          booking.eventType.duration,
          booking.host.profile?.name || 'Host',
          booking.host.email,
          cancelToken,
          rescheduleToken
        ).catch(e => console.error('Failed to send booking confirmation email:', e));

        await this.slackService.sendBookingNotification(
          dto.hostId,
          dto.guestName,
          dto.guestEmail,
          booking.startTime.toISOString(),
          booking.eventType.title
        ).catch(e => console.error('Failed to send Slack notification:', e));

        // Push Notifications
        await this.pushService.sendToUser(
          dto.hostId, 
          'New Booking', 
          `You have a new booking with ${dto.guestName} for ${booking.eventType.title}`
        ).catch(e => console.error('Failed to send push notification to host:', e));
        
        const guestUser = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
        if (guestUser) {
           await this.pushService.sendToUser(
             guestUser.id,
             'Booking Confirmed',
             `Your booking for ${booking.eventType.title} with ${booking.host.profile?.name || 'Host'} is confirmed.`
           ).catch(e => console.error('Failed to send push notification to guest:', e));
        }
      } catch (error: any) {
        this.logger.error(`Failed during post-booking workflow for ${booking.id}: ${error.message}`);
        // Even if notifications fail, the booking is already confirmed in the database.
        // If it's a critical system error right after calendar, we still keep the booking
        // but it might not have sent emails.
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
      return { booking: finalBooked[0], confirmationToken };
    }
    
    return {
      seriesId: transactionResult.seriesId,
      requested: occurrencesToAttempt.length,
      booked: finalBooked.length,
      skipped: transactionResult.skippedOccurrences,
      bookings: finalBooked,
      confirmationToken
    };
  }

  async getHostBookings(hostId: string) {
    return this.prisma.booking.findMany({
      where: { hostId },
      orderBy: { startTime: 'desc' },
      include: {
        eventType: true,
      }
    });
  }

  async cancelBooking(bookingId: string, hostId: string, reason: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.hostId !== hostId) {
      throw new BadRequestException('Unauthorized');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason: reason },
      include: { eventType: true },
    });

    // Trigger cancel email via EmailService
    await this.emailService.sendCancellationEmail(
      booking.guestEmail,
      booking.guestName,
      updatedBooking.eventType.title,
      reason
    ).catch(e => console.error('Failed to send cancellation email:', e));

    // Slack Notification
    await this.slackService.sendCancellationNotification(
      hostId,
      booking.guestName,
      updatedBooking.eventType.title,
      reason
    ).catch(e => console.error('Failed to send Slack cancellation notification:', e));

    // Update external calendar
    if (booking.externalEventId) {
      await this.calendarService.deleteCalendarEvent(hostId, booking.externalEventId)
        .catch(e => console.error('Failed to delete external calendar event:', e));
    }

    // Push Notification
    await this.pushService.sendToUser(
      hostId,
      'Booking Cancelled',
      `Booking with ${booking.guestName} for ${updatedBooking.eventType.title} was cancelled.`
    );
    const guestUser = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
    if (guestUser) {
      await this.pushService.sendToUser(
        guestUser.id,
        'Booking Cancelled',
        `Your booking for ${updatedBooking.eventType.title} was cancelled.`
      );
    }

    return updatedBooking;
  }

  async cancelSeries(seriesId: string, hostId: string, reason: string) {
    const series = await this.prisma.bookingSeries.findUnique({
      where: { id: seriesId },
      include: { bookings: true }
    });

    if (!series) {
      throw new BadRequestException('Series not found');
    }

    if (series.hostId !== hostId) {
      throw new BadRequestException('Unauthorized');
    }

    const now = new Date();
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        bookingSeriesId: seriesId,
        hostId,
        startTime: { gt: now },
        status: { in: ['CONFIRMED', 'RESCHEDULED'] }
      },
      include: { eventType: true }
    });

    if (futureBookings.length === 0) {
      throw new BadRequestException('No active future bookings to cancel in this series');
    }

    const updatedBookings: any[] = [];
    const transactionResult = await this.prisma.$transaction(async (tx) => {
       for (const booking of futureBookings) {
          const updated = await tx.booking.update({
             where: { id: booking.id },
             data: { status: 'CANCELLED', cancelReason: reason },
             include: { eventType: true }
          });
          updatedBookings.push(updated);
       }
       return updatedBookings;
    });

    // Handle external effects safely outside the transaction
    for (const booking of updatedBookings) {
      // Trigger cancel email via EmailService
      await this.emailService.sendCancellationEmail(
        booking.guestEmail,
        booking.guestName,
        booking.eventType.title,
        reason
      ).catch(e => console.error('Failed to send series cancellation email:', e));

      // Slack Notification
      await this.slackService.sendCancellationNotification(
        hostId,
        booking.guestName,
        booking.eventType.title,
        reason
      ).catch(e => console.error('Failed to send Slack notification:', e));

      // Update external calendar
      if (booking.externalEventId) {
        await this.calendarService.deleteCalendarEvent(hostId, booking.externalEventId)
          .catch(e => console.error('Failed to delete calendar event for series cancellation:', e));
      }
      
      const guestUser = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
      if (guestUser) {
        await this.pushService.sendToUser(
          guestUser.id,
          'Series Cancelled',
          `Your upcoming booking for ${booking.eventType.title} was cancelled.`
        );
      }
    }

    await this.pushService.sendToUser(
      hostId,
      'Series Cancelled',
      `Cancelled ${updatedBookings.length} upcoming occurrences.`
    );

    return { success: true, count: updatedBookings.length };
  }

  async rescheduleBooking(bookingId: string, hostId: string, newStartTime: Date, newEndTime: Date) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.hostId !== hostId) {
      throw new BadRequestException('Unauthorized');
    }

    // Check for overlap again
    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        hostId,
        status: 'CONFIRMED',
        id: { not: bookingId },
        OR: [
          {
            startTime: { lt: newEndTime },
            endTime: { gt: newStartTime },
          }
        ]
      }
    });

    if (overlappingBooking) {
      throw new BadRequestException('The host is already booked for this new time slot.');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: 'RESCHEDULED', 
        startTime: newStartTime, 
        endTime: newEndTime 
      },
      include: { eventType: true },
    });

    // Trigger reschedule email via EmailService
    await this.emailService.sendRescheduleEmail(
      booking.guestEmail,
      booking.guestName,
      updatedBooking.eventType.title,
      newStartTime.toISOString(),
      booking.meetLink || undefined
    ).catch(e => console.error('Failed to send reschedule email:', e));

    // Update external calendar
    if (booking.externalEventId) {
      await this.calendarService.updateCalendarEvent(
        hostId, 
        booking.externalEventId, 
        newStartTime.toISOString(), 
        newEndTime.toISOString()
      ).catch(e => console.error('Failed to update external calendar event:', e));
    }

    await this.pushService.sendToUser(
      hostId,
      'Booking Rescheduled',
      `Booking with ${booking.guestName} was rescheduled to ${newStartTime.toLocaleString()}.`
    );
    const guestUser = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
    if (guestUser) {
      await this.pushService.sendToUser(
        guestUser.id,
        'Booking Rescheduled',
        `Your booking for ${updatedBooking.eventType.title} was rescheduled to ${newStartTime.toLocaleString()}.`
      );
    }

    return updatedBooking;
  }

  async guestCancel(token: string) {
    const tokenRecord = await this.secureTokenService.verifyAndConsumeToken(token, TokenType.GUEST_CANCEL);
    if (!tokenRecord || !tokenRecord.bookingId || !tokenRecord.userId) {
      throw new BadRequestException('Invalid or expired cancellation token');
    }

    const booking = await this.prisma.booking.findUnique({ where: { id: tokenRecord.bookingId }, include: { eventType: true } });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.status === 'CANCELLED') {
      return { success: true };
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelReason: 'Cancelled by Guest' },
      include: { eventType: true, host: true }
    });

    await this.emailService.sendCancellationEmail(
      booking.guestEmail,
      booking.guestName,
      updatedBooking.eventType.title,
      'Cancelled by Guest'
    );

    await this.emailService.sendHostNotificationEmail(
      updatedBooking.host.email,
      booking.guestName,
      updatedBooking.eventType.title,
      'CANCELLED'
    ).catch(() => {});

    await this.slackService.sendCancellationNotification(
      tokenRecord.userId,
      booking.guestName,
      updatedBooking.eventType.title,
      'Cancelled by Guest'
    ).catch(() => {});

    if (booking.externalEventId) {
      await this.calendarService.deleteCalendarEvent(tokenRecord.userId, booking.externalEventId).catch(() => {});
    }

    await this.pushService.sendToUser(
      tokenRecord.userId,
      'Booking Cancelled by Guest',
      `Booking with ${booking.guestName} for ${updatedBooking.eventType.title} was cancelled.`
    );
    const guestUser = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
    if (guestUser) {
      await this.pushService.sendToUser(
        guestUser.id,
        'Booking Cancelled',
        `Your booking for ${updatedBooking.eventType.title} was cancelled successfully.`
      );
    }

    // Invalidate reschedule tokens
    await this.secureTokenService.revokeTokensForBooking(booking.id, TokenType.GUEST_RESCHEDULE);

    return { success: true };
  }

  async guestReschedule(token: string, newStartTime: string) {
    const tokenRecord = await this.secureTokenService.verifyAndConsumeToken(token, TokenType.GUEST_RESCHEDULE);
    if (!tokenRecord || !tokenRecord.bookingId || !tokenRecord.userId) {
      throw new BadRequestException('Invalid or expired reschedule token');
    }

    const booking = await this.prisma.booking.findUnique({ where: { id: tokenRecord.bookingId } });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }
    
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot reschedule a cancelled booking');
    }

    const eventType = await this.prisma.eventType.findUnique({ where: { id: booking.eventTypeId } });
    if (!eventType) throw new BadRequestException('EventType not found');

    const start = new Date(newStartTime);
    const end = new Date(start.getTime() + eventType.duration * 60000);

    const occurrencesToAttempt = [{ startTime: start, endTime: end, occurrenceNumber: 1 }];

    const evaluated = await this.availabilityEngine.evaluateSlots(
      tokenRecord.userId,
      booking.eventTypeId,
      occurrencesToAttempt
    );

    if (!evaluated[0].isAvailable) {
      throw new BadRequestException(evaluated[0].reason || 'Time slot is not available');
    }

    // Check overlap again directly
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        hostId: tokenRecord.userId,
        status: 'CONFIRMED',
        id: { not: booking.id },
        OR: [
          { startTime: { lt: end }, endTime: { gt: start } }
        ]
      }
    });

    if (overlapping) {
      throw new BadRequestException('Host is already booked for this slot');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'RESCHEDULED',
        startTime: start,
        endTime: end
      },
      include: { eventType: true, host: true }
    });

    if (booking.externalEventId) {
      await this.calendarService.updateCalendarEvent(
        tokenRecord.userId,
        booking.externalEventId,
        start.toISOString(),
        end.toISOString()
      ).catch(() => {});
    }
    
    const rescheduleToken = await this.secureTokenService.generateToken(TokenType.GUEST_RESCHEDULE, 168, booking.hostId, booking.id);
    const cancelToken = await this.secureTokenService.generateToken(TokenType.GUEST_CANCEL, 168, booking.hostId, booking.id);

    await this.emailService.sendRescheduleEmail(
      booking.guestEmail,
      booking.guestName,
      updatedBooking.eventType.title,
      start.toISOString(),
      booking.meetLink || undefined,
      cancelToken,
      rescheduleToken
    ).catch(() => {});
    
    await this.emailService.sendHostNotificationEmail(
      updatedBooking.host.email,
      booking.guestName,
      updatedBooking.eventType.title,
      'RESCHEDULED',
      start.toISOString()
    ).catch(() => {});

    await this.pushService.sendToUser(
      tokenRecord.userId,
      'Booking Rescheduled by Guest',
      `Booking with ${booking.guestName} was rescheduled to ${start.toLocaleString()}.`
    );
    const guestUsr = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
    if (guestUsr) {
      await this.pushService.sendToUser(
        guestUsr.id,
        'Booking Rescheduled',
        `Your booking for ${updatedBooking.eventType.title} was rescheduled successfully.`
      );
    }

    return { success: true };
  }

  async getConfirmationDetails(token: string) {
    const tokenRecord = await this.secureTokenService.verifyToken(token, TokenType.BOOKING_CONFIRMATION);
    if (!tokenRecord || !tokenRecord.bookingId) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: tokenRecord.bookingId },
      include: {
        eventType: true,
        host: {
          include: { profile: true }
        }
      }
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    // Return limited public booking information
    return {
      id: booking.id,
      eventTitle: booking.eventType.title,
      hostName: booking.host.profile?.name || 'Host',
      date: booking.startTime,
      startTime: booking.startTime,
      endTime: booking.endTime,
      meetingLocation: booking.eventType.location,
      meetLink: booking.meetLink,
      status: booking.status,
      cancelReason: booking.cancelReason,
      isGroupEvent: booking.eventType.isGroupEvent,
      confirmationMessage: booking.eventType.confirmationMessage,
      redirectUrl: booking.eventType.redirectUrl
    };
  }
}
