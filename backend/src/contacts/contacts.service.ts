import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async getContacts(hostId: string, search?: string, tag?: string) {
    const whereClause: any = { hostId };
    
    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { jobTitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (tag && tag !== 'All') {
      whereClause.tags = { has: tag };
    }

    return this.prisma.contact.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getContactById(id: string, hostId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.hostId !== hostId) {
      throw new BadRequestException('Contact not found or unauthorized');
    }
    return contact;
  }

  async getContactBookings(id: string, hostId: string) {
    const contact = await this.getContactById(id, hostId);
    
    return this.prisma.booking.findMany({
      where: {
        hostId,
        guestEmail: { equals: contact.email, mode: 'insensitive' },
      },
      include: {
        eventType: {
          select: {
            id: true,
            title: true,
            duration: true,
            color: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async createOrUpdateContact(
    hostId: string,
    name: string,
    email: string,
    phone?: string,
    company?: string,
    jobTitle?: string,
    timezone?: string,
    notes?: string,
    tags?: string[],
    meetingDate?: Date,
  ) {
    const cleanEmail = email?.trim().toLowerCase();
    const existing = await this.prisma.contact.findUnique({
      where: {
        hostId_email: {
          hostId,
          email: cleanEmail,
        },
      },
    });

    if (existing) {
      return this.prisma.contact.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          phone: phone !== undefined ? phone : existing.phone,
          company: company !== undefined ? company : existing.company,
          jobTitle: jobTitle !== undefined ? jobTitle : existing.jobTitle,
          timezone: timezone !== undefined ? timezone : existing.timezone,
          notes: notes !== undefined ? notes : existing.notes,
          tags: tags !== undefined ? tags : existing.tags,
          lastMeetingDate: meetingDate || existing.lastMeetingDate,
          totalMeetings: { increment: meetingDate ? 1 : 0 },
        },
      });
    }

    return this.prisma.contact.create({
      data: {
        hostId,
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: phone || null,
        company: company || null,
        jobTitle: jobTitle || null,
        timezone: timezone || null,
        notes: notes || null,
        tags: tags || [],
        lastMeetingDate: meetingDate || null,
        totalMeetings: meetingDate ? 1 : 0,
      },
    });
  }

  async updateContact(id: string, hostId: string, data: any) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.hostId !== hostId) {
      throw new BadRequestException('Contact not found or unauthorized');
    }

    const { name, email, phone, company, jobTitle, timezone, notes, tags } = data;

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email: email.trim().toLowerCase() }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(timezone !== undefined && { timezone }),
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
      },
    });
  }

  async bulkImportContacts(hostId: string, contacts: any[]) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new BadRequestException('No contacts provided for import');
    }

    let importedCount = 0;
    for (const item of contacts) {
      if (!item.email || !item.name) continue;
      const cleanEmail = item.email.trim().toLowerCase();

      await this.prisma.contact.upsert({
        where: {
          hostId_email: {
            hostId,
            email: cleanEmail,
          },
        },
        create: {
          hostId,
          name: item.name.trim(),
          email: cleanEmail,
          phone: item.phone ? String(item.phone).trim() : null,
          company: item.company ? String(item.company).trim() : null,
          jobTitle: item.jobTitle ? String(item.jobTitle).trim() : null,
          notes: item.notes ? String(item.notes).trim() : null,
          tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [String(item.tags).trim()] : []),
        },
        update: {
          name: item.name.trim(),
          phone: item.phone ? String(item.phone).trim() : undefined,
          company: item.company ? String(item.company).trim() : undefined,
          jobTitle: item.jobTitle ? String(item.jobTitle).trim() : undefined,
        },
      });
      importedCount++;
    }

    return { success: true, count: importedCount };
  }

  async deleteContact(id: string, hostId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.hostId !== hostId) {
      throw new BadRequestException('Contact not found or unauthorized');
    }
    return this.prisma.contact.delete({ where: { id } });
  }

  async bulkDeleteContacts(hostId: string, ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No IDs provided');
    }

    const result = await this.prisma.contact.deleteMany({
      where: {
        hostId,
        id: { in: ids },
      },
    });

    return { success: true, deletedCount: result.count };
  }
}
