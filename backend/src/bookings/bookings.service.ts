import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { EmailService } from '../integrations/email.service';
import { CalendarService } from '../integrations/calendar.service';
import { SlackService } from '../integrations/slack.service';
import { ContactsService } from '../contacts/contacts.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private calendarService: CalendarService,
    private slackService: SlackService,
    private contactsService: ContactsService,
  ) {}

  async createBooking(dto: CreateBookingDto) {
    // 1. Check for overlapping bookings
    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        hostId: dto.hostId,
        status: 'CONFIRMED',
        OR: [
          {
            startTime: { lt: new Date(dto.endTime) },
            endTime: { gt: new Date(dto.startTime) },
          }
        ]
      }
    });

    if (overlappingBooking) {
      throw new BadRequestException('This time slot is no longer available.');
    }

    // 2. Create the booking
    const booking = await this.prisma.booking.create({
      data: {
        hostId: dto.hostId,
        eventTypeId: dto.eventTypeId,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        guestPhone: dto.guestPhone,
        guestCompany: dto.guestCompany,
        guestNotes: dto.guestNotes,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: 'CONFIRMED',
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

    // 3. Integrations (Mocked)
    const bookingWithIncludes = booking as any;
    const calendarResult = await this.calendarService.createCalendarEvent(
      dto.hostId,
      bookingWithIncludes.host.email,
      bookingWithIncludes.guestEmail,
      bookingWithIncludes.startTime.toISOString(),
      bookingWithIncludes.endTime.toISOString(),
      bookingWithIncludes.eventType.title
    );

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { meetLink: calendarResult.meetLink },
    });

    await this.emailService.sendBookingConfirmation(
      bookingWithIncludes.guestEmail,
      bookingWithIncludes.guestName,
      bookingWithIncludes.eventType.title,
      bookingWithIncludes.startTime.toISOString()
    );

    // Slack Notification
    await this.slackService.sendBookingNotification(
      dto.hostId,
      dto.guestName,
      dto.guestEmail,
      dto.startTime,
      bookingWithIncludes.eventType.title
    );

    // Auto-create or update contact
    await this.contactsService.createOrUpdateContact(
      dto.hostId,
      dto.guestName,
      dto.guestEmail,
      dto.guestPhone,
      dto.guestCompany,
      new Date(dto.startTime)
    );

    return bookingWithIncludes;
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

    // TODO: Trigger cancel email via EmailService
    // await this.emailService.sendCancellationEmail(...)

    // Slack Notification
    await this.slackService.sendCancellationNotification(
      hostId,
      booking.guestName,
      updatedBooking.eventType.title,
      reason
    );

    return updatedBooking;
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

    // TODO: Trigger reschedule email via EmailService
    return updatedBooking;
  }
}
