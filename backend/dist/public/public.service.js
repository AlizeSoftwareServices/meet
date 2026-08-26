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
exports.PublicService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const calendar_service_1 = require("../integrations/calendar.service");
let PublicService = class PublicService {
    prisma;
    calendarService;
    constructor(prisma, calendarService) {
        this.prisma = prisma;
        this.calendarService = calendarService;
    }
    async getUserProfile(username) {
        const profile = await this.prisma.profile.findUnique({
            where: { username },
            include: {
                user: {
                    include: {
                        eventTypes: {
                            where: { isActive: true },
                            orderBy: { title: 'asc' }
                        }
                    }
                }
            }
        });
        if (!profile) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            id: profile.userId,
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar,
            bio: profile.bio,
            timezone: profile.timezone,
            company: profile.company,
            eventTypes: profile.user.eventTypes
        };
    }
    async getAvailableSlots(username, eventSlug, dateStr, guestTimezone) {
        const profile = await this.prisma.profile.findUnique({
            where: { username },
            include: { user: true }
        });
        if (!profile)
            throw new common_1.NotFoundException('User not found');
        const eventType = await this.prisma.eventType.findUnique({
            where: { userId_slug: { userId: profile.userId, slug: eventSlug } }
        });
        if (!eventType || !eventType.isActive) {
            throw new common_1.NotFoundException('Event type not found or inactive');
        }
        const availability = await this.prisma.availability.findUnique({
            where: { userId: profile.userId },
            include: { slots: true, overrides: true }
        });
        if (!availability) {
            return [];
        }
        const hostTimezone = profile.timezone || 'UTC';
        const [year, month, day] = dateStr.split('-').map(Number);
        const hostDate = (0, date_fns_tz_1.fromZonedTime)(new Date(year, month - 1, day), hostTimezone);
        const dayOfWeek = (0, date_fns_tz_1.toZonedTime)(hostDate, hostTimezone).getDay();
        const override = availability.overrides.find(o => o.date === dateStr);
        let workingPeriods = [];
        if (override) {
            if (override.isAvailable && override.startTime && override.endTime) {
                workingPeriods.push({
                    start: this.createZonedDate(dateStr, override.startTime, hostTimezone),
                    end: this.createZonedDate(dateStr, override.endTime, hostTimezone)
                });
            }
        }
        else {
            const daySlots = availability.slots.filter(s => s.dayOfWeek === dayOfWeek);
            for (const slot of daySlots) {
                workingPeriods.push({
                    start: this.createZonedDate(dateStr, slot.startTime, hostTimezone),
                    end: this.createZonedDate(dateStr, slot.endTime, hostTimezone)
                });
            }
        }
        if (workingPeriods.length === 0)
            return [];
        const duration = eventType.duration;
        const bufferBefore = eventType.bufferBefore || 0;
        const bufferAfter = eventType.bufferAfter || 0;
        let potentialSlots = [];
        for (const period of workingPeriods) {
            let current = period.start;
            while ((0, date_fns_1.isBefore)((0, date_fns_1.addMinutes)(current, duration), period.end) || (0, date_fns_1.addMinutes)(current, duration).getTime() === period.end.getTime()) {
                potentialSlots.push({
                    startTime: current,
                    endTime: (0, date_fns_1.addMinutes)(current, duration)
                });
                current = (0, date_fns_1.addMinutes)(current, duration);
            }
        }
        const dayStart = (0, date_fns_1.startOfDay)(hostDate);
        const dayEnd = (0, date_fns_1.endOfDay)(hostDate);
        const existingBookings = await this.prisma.booking.findMany({
            where: {
                hostId: profile.userId,
                status: 'CONFIRMED',
                startTime: { gte: dayStart },
                endTime: { lte: dayEnd }
            }
        });
        const externalBusyPeriods = await this.calendarService.getBusyPeriods(profile.userId, dayStart.toISOString(), dayEnd.toISOString());
        const now = new Date();
        const validSlots = [];
        for (const slot of potentialSlots) {
            if ((0, date_fns_1.isBefore)(slot.startTime, now))
                continue;
            const slotStartWithBuffer = (0, date_fns_1.addMinutes)(slot.startTime, -bufferBefore);
            const slotEndWithBuffer = (0, date_fns_1.addMinutes)(slot.endTime, bufferAfter);
            let overlappingSameEventCount = 0;
            let otherEventOverlap = false;
            for (const booking of existingBookings) {
                const bookingStart = booking.startTime;
                const bookingEnd = booking.endTime;
                if ((0, date_fns_1.isBefore)(slotStartWithBuffer, bookingEnd) && (0, date_fns_1.isAfter)(slotEndWithBuffer, bookingStart)) {
                    if (booking.eventTypeId === eventType.id && eventType.isGroupEvent) {
                        if (bookingStart.getTime() === slot.startTime.getTime() && bookingEnd.getTime() === slot.endTime.getTime()) {
                            overlappingSameEventCount++;
                        }
                        else {
                            otherEventOverlap = true;
                        }
                    }
                    else {
                        otherEventOverlap = true;
                    }
                }
            }
            if (otherEventOverlap)
                continue;
            if (eventType.isGroupEvent && overlappingSameEventCount >= eventType.maxInvitees)
                continue;
            let externalConflict = false;
            for (const busy of externalBusyPeriods) {
                if ((0, date_fns_1.isBefore)(slotStartWithBuffer, busy.end) && (0, date_fns_1.isAfter)(slotEndWithBuffer, busy.start)) {
                    externalConflict = true;
                    break;
                }
            }
            if (externalConflict)
                continue;
            validSlots.push({
                startTime: slot.startTime.toISOString(),
                endTime: slot.endTime.toISOString(),
                spotsRemaining: eventType.isGroupEvent ? (eventType.maxInvitees - overlappingSameEventCount) : 1
            });
        }
        return validSlots;
    }
    createZonedDate(dateStr, timeStr, timeZone) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes);
        return (0, date_fns_tz_1.fromZonedTime)(localDate, timeZone);
    }
};
exports.PublicService = PublicService;
exports.PublicService = PublicService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        calendar_service_1.CalendarService])
], PublicService);
//# sourceMappingURL=public.service.js.map