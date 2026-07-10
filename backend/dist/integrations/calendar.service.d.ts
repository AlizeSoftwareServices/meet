import { PrismaService } from '../prisma/prisma.service';
export declare class CalendarService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getOAuth2Client;
    createCalendarEvent(hostId: string, hostEmail: string, guestEmail: string, startTime: string, endTime: string, title: string): Promise<{
        meetLink: any;
        eventId: any;
    }>;
    private createMicrosoftEvent;
    private mockCreateEvent;
}
