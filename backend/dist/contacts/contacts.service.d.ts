import { PrismaService } from '../prisma/prisma.service';
export declare class ContactsService {
    private prisma;
    constructor(prisma: PrismaService);
    getContacts(hostId: string, search?: string): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }[]>;
    createOrUpdateContact(hostId: string, name: string, email: string, phone?: string, company?: string, meetingDate?: Date): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }>;
    updateContact(id: string, hostId: string, data: any): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }>;
    deleteContact(id: string, hostId: string): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }>;
}
