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
var CronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("./email.service");
let CronService = CronService_1 = class CronService {
    prisma;
    emailService;
    logger = new common_1.Logger(CronService_1.name);
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async handleUpcomingBookingsReminders() {
        this.logger.debug('Running cron job to find upcoming bookings in 24 hours');
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        const upcomingBookings = await this.prisma.booking.findMany({
            where: {
                status: 'CONFIRMED',
                startTime: {
                    gte: in24Hours,
                    lt: in25Hours,
                },
            },
            include: {
                eventType: true,
            },
        });
        for (const booking of upcomingBookings) {
            this.logger.debug(`Sending reminder for booking ${booking.id}`);
            await this.emailService.sendBookingConfirmation(booking.guestEmail, booking.guestName, `REMINDER: ${booking.eventType.title}`, booking.startTime.toISOString());
        }
    }
};
exports.CronService = CronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CronService.prototype, "handleUpcomingBookingsReminders", null);
exports.CronService = CronService = CronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], CronService);
//# sourceMappingURL=cron.service.js.map