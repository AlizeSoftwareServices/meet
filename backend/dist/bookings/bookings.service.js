"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../integrations/email.service");
const calendar_service_1 = require("../integrations/calendar.service");
const slack_service_1 = require("../integrations/slack.service");
const contacts_service_1 = require("../contacts/contacts.service");
let BookingsService = class BookingsService {
    prisma;
    emailService;
    calendarService;
    slackService;
    contactsService;
    constructor(prisma, emailService, calendarService, slackService, contactsService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.calendarService = calendarService;
        this.slackService = slackService;
        this.contactsService = contactsService;
    }
    async createBooking(dto) {
        const eventType = await this.prisma.eventType.findUnique({
            where: { id: dto.eventTypeId }
        });
        if (!eventType) {
            throw new common_1.BadRequestException('Event type not found');
        }
        if (eventType.isGroupEvent) {
            const existingBookingsCount = await this.prisma.booking.count({
                where: {
                    eventTypeId: dto.eventTypeId,
                    status: 'CONFIRMED',
                    startTime: new Date(dto.startTime),
                    endTime: new Date(dto.endTime),
                }
            });
            if (existingBookingsCount >= eventType.maxInvitees) {
                throw new common_1.BadRequestException('This group event slot is full.');
            }
            const otherOverlapping = await this.prisma.booking.findFirst({
                where: {
                    hostId: dto.hostId,
                    status: 'CONFIRMED',
                    eventTypeId: { not: dto.eventTypeId },
                    OR: [
                        {
                            startTime: { lt: new Date(dto.endTime) },
                            endTime: { gt: new Date(dto.startTime) },
                        }
                    ]
                }
            });
            if (otherOverlapping) {
                throw new common_1.BadRequestException('The host is busy with another event at this time.');
            }
        }
        else {
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
                throw new common_1.BadRequestException('This time slot is no longer available.');
            }
        }
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
        const bookingWithIncludes = booking;
        const calendarResult = await this.calendarService.createCalendarEvent(dto.hostId, bookingWithIncludes.host.email, bookingWithIncludes.guestEmail, bookingWithIncludes.startTime.toISOString(), bookingWithIncludes.endTime.toISOString(), bookingWithIncludes.eventType.title);
        await this.prisma.booking.update({
            where: { id: booking.id },
            data: { meetLink: calendarResult.meetLink },
        });
        await this.emailService.sendBookingConfirmation(bookingWithIncludes.guestEmail, bookingWithIncludes.guestName, bookingWithIncludes.eventType.title, bookingWithIncludes.startTime.toISOString(), calendarResult.meetLink);
        await this.slackService.sendBookingNotification(dto.hostId, dto.guestName, dto.guestEmail, dto.startTime, bookingWithIncludes.eventType.title);
        await this.contactsService.createOrUpdateContact(dto.hostId, dto.guestName, dto.guestEmail, dto.guestPhone, dto.guestCompany, new Date(dto.startTime));
        return bookingWithIncludes;
    }
    async getHostBookings(hostId) {
        return this.prisma.booking.findMany({
            where: { hostId },
            orderBy: { startTime: 'desc' },
            include: {
                eventType: true,
            }
        });
    }
    async cancelBooking(bookingId, hostId, reason) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        if (booking.hostId !== hostId) {
            throw new common_1.BadRequestException('Unauthorized');
        }
        const updatedBooking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED', cancelReason: reason },
            include: { eventType: true },
        });
        await this.emailService.sendCancellationEmail(booking.guestEmail, booking.guestName, updatedBooking.eventType.title, reason);
        await this.slackService.sendCancellationNotification(hostId, booking.guestName, updatedBooking.eventType.title, reason);
        return updatedBooking;
    }
    async rescheduleBooking(bookingId, hostId, newStartTime, newEndTime) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        if (booking.hostId !== hostId) {
            throw new common_1.BadRequestException('Unauthorized');
        }
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
            throw new common_1.BadRequestException('The host is already booked for this new time slot.');
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
        await this.emailService.sendRescheduleEmail(booking.guestEmail, booking.guestName, updatedBooking.eventType.title, newStartTime.toISOString(), booking.meetLink || undefined);
        return updatedBooking;
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        calendar_service_1.CalendarService,
        slack_service_1.SlackService,
        contacts_service_1.ContactsService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map