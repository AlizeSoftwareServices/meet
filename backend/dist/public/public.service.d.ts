import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../integrations/calendar.service';
export declare class PublicService {
    private prisma;
    private calendarService;
    constructor(prisma: PrismaService, calendarService: CalendarService);
    getUserProfile(username: string): Promise<{
        id: string;
        name: string | null;
        username: string | null;
        avatar: string | null;
        bio: string | null;
        timezone: string;
        company: string | null;
        eventTypes: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string;
            description: string | null;
            duration: number;
            location: string | null;
            slug: string;
            color: string;
            isActive: boolean;
            maxDailyBookings: number | null;
            minNotice: number | null;
            maxAdvanceDays: number | null;
            bufferBefore: number | null;
            bufferAfter: number | null;
            isGroupEvent: boolean;
            maxInvitees: number;
        }[];
    }>;
    getAvailableSlots(username: string, eventSlug: string, dateStr: string, guestTimezone?: string): Promise<{
        startTime: string;
        endTime: string;
        spotsRemaining: number;
    }[]>;
    private createZonedDate;
}
