import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private prisma: PrismaService) {}

  private isValidObjectId(id: string): boolean {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  }

  async getContacts(hostId: string, search?: string, tag?: string) {
    if (!this.isValidObjectId(hostId)) {
      throw new BadRequestException('Invalid host ID');
    }

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
      whereClause.tags = { has: tag.trim() };
    }

    return this.prisma.contact.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getContactById(id: string, hostId: string) {
    if (!this.isValidObjectId(id) || !this.isValidObjectId(hostId)) {
      throw new BadRequestException('Invalid contact or host ID format');
    }

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
    arg6?: string | Date, // Can be jobTitle (string) OR meetingDate (Date/ISO string from bookings.service)
    timezone?: string,
    notes?: string,
    tags?: string[],
    meetingDate?: Date | string,
  ) {
    if (!this.isValidObjectId(hostId)) {
      throw new BadRequestException('Invalid host ID');
    }

    if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      throw new BadRequestException('Valid email address is required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanEmail.split('@')[0];

    // Detect if arg6 is meetingDate (passed by bookings.service) or jobTitle (passed by controller)
    let resolvedJobTitle: string | null = null;
    let resolvedMeetingDate: Date | null = null;

    if (arg6 instanceof Date) {
      resolvedMeetingDate = arg6;
    } else if (typeof arg6 === 'string' && arg6.trim()) {
      const parsed = Date.parse(arg6);
      if (!isNaN(parsed) && (arg6.includes('T') || (arg6.includes('-') && arg6.length >= 10))) {
        resolvedMeetingDate = new Date(arg6);
      } else {
        resolvedJobTitle = arg6.trim();
      }
    }

    if (meetingDate) {
      resolvedMeetingDate = meetingDate instanceof Date ? meetingDate : new Date(meetingDate);
    }

    // Sanitize tags
    let cleanTags: string[] = [];
    if (Array.isArray(tags)) {
      cleanTags = tags.map((t) => String(t).trim()).filter(Boolean);
    }

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
          name: cleanName || existing.name,
          phone: phone !== undefined ? (phone?.trim() || null) : existing.phone,
          company: company !== undefined ? (company?.trim() || null) : existing.company,
          jobTitle: resolvedJobTitle !== null ? resolvedJobTitle : existing.jobTitle,
          timezone: timezone !== undefined ? (timezone?.trim() || null) : existing.timezone,
          notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
          tags: cleanTags.length > 0 ? cleanTags : existing.tags,
          lastMeetingDate: resolvedMeetingDate || existing.lastMeetingDate,
          totalMeetings: { increment: resolvedMeetingDate ? 1 : 0 },
        },
      });
    }

    return this.prisma.contact.create({
      data: {
        hostId,
        name: cleanName,
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        company: company ? company.trim() : null,
        jobTitle: resolvedJobTitle,
        timezone: timezone ? timezone.trim() : null,
        notes: notes ? notes.trim() : null,
        tags: cleanTags,
        lastMeetingDate: resolvedMeetingDate,
        totalMeetings: resolvedMeetingDate ? 1 : 0,
      },
    });
  }

  async updateContact(id: string, hostId: string, data: any) {
    if (!this.isValidObjectId(id) || !this.isValidObjectId(hostId)) {
      throw new BadRequestException('Invalid contact or host ID format');
    }

    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.hostId !== hostId) {
      throw new BadRequestException('Contact not found or unauthorized');
    }

    const { name, email, phone, company, jobTitle, timezone, notes, tags } = data;

    let cleanEmail: string | undefined = undefined;
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
        throw new BadRequestException('Invalid email address provided');
      }
      cleanEmail = email.trim().toLowerCase();
    }

    // Sanitize tags
    let cleanTags: string[] | undefined = undefined;
    if (tags !== undefined) {
      cleanTags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
    }

    try {
      return await this.prisma.contact.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(cleanEmail !== undefined && { email: cleanEmail }),
          ...(phone !== undefined && { phone: phone ? phone.trim() : null }),
          ...(company !== undefined && { company: company ? company.trim() : null }),
          ...(jobTitle !== undefined && { jobTitle: jobTitle ? jobTitle.trim() : null }),
          ...(timezone !== undefined && { timezone: timezone ? timezone.trim() : null }),
          ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
          ...(cleanTags !== undefined && { tags: cleanTags }),
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('A contact with this email already exists in your directory');
      }
      throw error;
    }
  }

  async bulkImportContacts(hostId: string, contacts: any[]) {
    if (!this.isValidObjectId(hostId)) {
      throw new BadRequestException('Invalid host ID');
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new BadRequestException('No contacts provided for import');
    }

    let importedCount = 0;
    for (const item of contacts) {
      if (!item || !item.email || typeof item.email !== 'string') continue;
      const cleanEmail = item.email.trim().toLowerCase();
      if (!cleanEmail.includes('@')) continue;

      const cleanName = (item.name && typeof item.name === 'string' && item.name.trim())
        ? item.name.trim()
        : cleanEmail.split('@')[0];

      // Parse tags from array or delimited string (e.g. "VIP, Client; Lead")
      let tagsArray: string[] = [];
      if (Array.isArray(item.tags)) {
        tagsArray = item.tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof item.tags === 'string' && item.tags.trim()) {
        tagsArray = item.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
      }

      await this.prisma.contact.upsert({
        where: {
          hostId_email: {
            hostId,
            email: cleanEmail,
          },
        },
        create: {
          hostId,
          name: cleanName,
          email: cleanEmail,
          phone: item.phone ? String(item.phone).trim() : null,
          company: item.company ? String(item.company).trim() : null,
          jobTitle: item.jobTitle ? String(item.jobTitle).trim() : null,
          timezone: item.timezone ? String(item.timezone).trim() : null,
          notes: item.notes ? String(item.notes).trim() : null,
          tags: tagsArray,
          totalMeetings: 0,
        },
        update: {
          name: cleanName,
          phone: item.phone ? String(item.phone).trim() : undefined,
          company: item.company ? String(item.company).trim() : undefined,
          jobTitle: item.jobTitle ? String(item.jobTitle).trim() : undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        },
      });
      importedCount++;
    }

    return { success: true, count: importedCount };
  }

  async deleteContact(id: string, hostId: string) {
    if (!this.isValidObjectId(id) || !this.isValidObjectId(hostId)) {
      throw new BadRequestException('Invalid contact or host ID format');
    }

    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.hostId !== hostId) {
      throw new BadRequestException('Contact not found or unauthorized');
    }
    return this.prisma.contact.delete({ where: { id } });
  }

  async bulkDeleteContacts(hostId: string, ids: string[]) {
    if (!this.isValidObjectId(hostId)) {
      throw new BadRequestException('Invalid host ID');
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No IDs provided for bulk delete');
    }

    const validIds = ids.filter((id) => this.isValidObjectId(id));
    if (validIds.length === 0) {
      throw new BadRequestException('No valid contact IDs provided');
    }

    const result = await this.prisma.contact.deleteMany({
      where: {
        hostId,
        id: { in: validIds },
      },
    });

    return { success: true, deletedCount: result.count };
  }
}
