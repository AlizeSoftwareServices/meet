import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardAnalytics(hostId: string): Promise<{
        stats: {
            title: string;
            value: string;
        }[];
        chartData: {
            name: string;
            bookings: number;
        }[];
    }>;
}
