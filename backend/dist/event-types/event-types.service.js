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
exports.EventTypesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EventTypesService = class EventTypesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        const { enableReminder24h, ...data } = dto;
        const eventType = await this.prisma.eventType.create({
            data: {
                ...data,
                userId,
            },
        });
        if (enableReminder24h) {
            await this.prisma.workflow.create({
                data: {
                    eventTypeId: eventType.id,
                    triggerType: 'BEFORE_EVENT',
                    timeOffset: 1440,
                    actionType: 'EMAIL',
                },
            });
        }
        return eventType;
    }
    async findAllForUser(userId) {
        return this.prisma.eventType.findMany({
            where: { userId },
            include: { workflows: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId) {
        const eventType = await this.prisma.eventType.findFirst({
            where: { id, userId },
            include: { workflows: true },
        });
        if (!eventType) {
            throw new common_1.NotFoundException('Event type not found');
        }
        return eventType;
    }
    async findBySlugAndHost(slug, hostId) {
        const eventType = await this.prisma.eventType.findUnique({
            where: {
                userId_slug: {
                    userId: hostId,
                    slug,
                }
            },
            include: { workflows: true },
        });
        if (!eventType) {
            throw new common_1.NotFoundException('Event type not found');
        }
        return eventType;
    }
    async update(id, userId, dto) {
        await this.findOne(id, userId);
        const { enableReminder24h, ...data } = dto;
        const eventType = await this.prisma.eventType.update({
            where: { id },
            data: data,
        });
        if (enableReminder24h !== undefined) {
            if (enableReminder24h) {
                const existing = await this.prisma.workflow.findFirst({
                    where: { eventTypeId: id, triggerType: 'BEFORE_EVENT', timeOffset: 1440 }
                });
                if (!existing) {
                    await this.prisma.workflow.create({
                        data: {
                            eventTypeId: id,
                            triggerType: 'BEFORE_EVENT',
                            timeOffset: 1440,
                            actionType: 'EMAIL',
                        }
                    });
                }
            }
            else {
                await this.prisma.workflow.deleteMany({
                    where: { eventTypeId: id, triggerType: 'BEFORE_EVENT', timeOffset: 1440 }
                });
            }
        }
        return eventType;
    }
    async remove(id, userId) {
        await this.findOne(id, userId);
        return this.prisma.eventType.delete({
            where: { id },
        });
    }
};
exports.EventTypesService = EventTypesService;
exports.EventTypesService = EventTypesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventTypesService);
//# sourceMappingURL=event-types.service.js.map