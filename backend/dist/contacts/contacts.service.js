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
exports.ContactsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ContactsService = class ContactsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getContacts(hostId, search) {
        const whereClause = { hostId };
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        return this.prisma.contact.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
        });
    }
    async createOrUpdateContact(hostId, name, email, phone, company, meetingDate) {
        const existing = await this.prisma.contact.findUnique({
            where: {
                hostId_email: {
                    hostId,
                    email,
                }
            }
        });
        if (existing) {
            return this.prisma.contact.update({
                where: { id: existing.id },
                data: {
                    name,
                    phone: phone || existing.phone,
                    company: company || existing.company,
                    lastMeetingDate: meetingDate || existing.lastMeetingDate,
                    totalMeetings: { increment: meetingDate ? 1 : 0 },
                }
            });
        }
        return this.prisma.contact.create({
            data: {
                hostId,
                name,
                email,
                phone,
                company,
                lastMeetingDate: meetingDate,
                totalMeetings: meetingDate ? 1 : 0,
            }
        });
    }
    async updateContact(id, hostId, data) {
        const contact = await this.prisma.contact.findUnique({ where: { id } });
        if (!contact || contact.hostId !== hostId) {
            throw new common_1.BadRequestException('Contact not found or unauthorized');
        }
        return this.prisma.contact.update({
            where: { id },
            data,
        });
    }
    async deleteContact(id, hostId) {
        const contact = await this.prisma.contact.findUnique({ where: { id } });
        if (!contact || contact.hostId !== hostId) {
            throw new common_1.BadRequestException('Contact not found or unauthorized');
        }
        return this.prisma.contact.delete({ where: { id } });
    }
};
exports.ContactsService = ContactsService;
exports.ContactsService = ContactsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContactsService);
//# sourceMappingURL=contacts.service.js.map