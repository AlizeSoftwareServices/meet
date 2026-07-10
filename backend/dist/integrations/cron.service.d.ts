import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
export declare class CronService {
    private readonly prisma;
    private readonly emailService;
    private readonly logger;
    constructor(prisma: PrismaService, emailService: EmailService);
    handleUpcomingBookingsReminders(): Promise<void>;
}
