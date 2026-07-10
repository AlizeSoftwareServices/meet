import { PrismaService } from '../prisma/prisma.service';
export declare class SlackService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    sendBookingNotification(hostId: string, guestName: string, guestEmail: string, startTime: string, eventTitle: string): Promise<void>;
    sendCancellationNotification(hostId: string, guestName: string, eventTitle: string, reason: string): Promise<void>;
}
