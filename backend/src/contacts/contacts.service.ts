import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async getContacts(hostId: string, search?: string) {
    const whereClause: any = { hostId };
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

  async createOrUpdateContact(hostId: string, name: string, email: string, phone?: string, company?: string, meetingDate?: Date) {
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

  async updateContact(id: string, hostId: string, data: any) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.hostId !== hostId) {
      throw new BadRequestException('Contact not found or unauthorized');
    }
    return this.prisma.contact.update({
      where: { id },
      data,
    });
  }

  async deleteContact(id: string, hostId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.hostId !== hostId) {
      throw new BadRequestException('Contact not found or unauthorized');
    }
    return this.prisma.contact.delete({ where: { id } });
  }
}
