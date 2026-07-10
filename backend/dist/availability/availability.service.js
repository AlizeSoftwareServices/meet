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
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AvailabilityService = class AvailabilityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAvailability(userId) {
        let availability = await this.prisma.availability.findUnique({
            where: { userId },
            include: {
                slots: true,
                overrides: true,
            },
        });
        if (!availability) {
            availability = await this.prisma.availability.create({
                data: { userId },
                include: { slots: true, overrides: true },
            });
        }
        return availability;
    }
    async setAvailability(userId, slots, overrides = []) {
        const availability = await this.getAvailability(userId);
        await this.prisma.availabilitySlot.deleteMany({
            where: { availabilityId: availability.id },
        });
        await this.prisma.availabilityOverride.deleteMany({
            where: { availabilityId: availability.id },
        });
        if (overrides && overrides.length > 0) {
            await this.prisma.availabilityOverride.createMany({
                data: overrides.map(override => ({
                    availabilityId: availability.id,
                    date: override.date,
                    isAvailable: override.isAvailable,
                    startTime: override.startTime,
                    endTime: override.endTime,
                })),
            });
        }
        if (slots && slots.length > 0) {
            await this.prisma.availabilitySlot.createMany({
                data: slots.map(slot => ({
                    availabilityId: availability.id,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                })),
            });
        }
        return this.getAvailability(userId);
    }
    async getHostAvailabilityForDate(hostId, date) {
        const availability = await this.getAvailability(hostId);
        const dateStr = date.toISOString().split('T')[0];
        const override = availability.overrides.find(o => o.date === dateStr);
        if (override) {
            if (!override.isAvailable)
                return [];
            if (override.startTime && override.endTime) {
                return [{ startTime: override.startTime, endTime: override.endTime }];
            }
        }
        const dayOfWeek = date.getDay();
        return availability.slots.filter((s) => s.dayOfWeek === dayOfWeek);
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map