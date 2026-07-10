import { PrismaService } from '../prisma/prisma.service';
export declare class AvailabilityService {
    private prisma;
    constructor(prisma: PrismaService);
    getAvailability(userId: string): Promise<{
        slots: {
            id: string;
            startTime: string;
            endTime: string;
            availabilityId: string;
            dayOfWeek: number;
        }[];
        overrides: {
            id: string;
            startTime: string | null;
            endTime: string | null;
            availabilityId: string;
            date: string;
            isAvailable: boolean;
        }[];
    } & {
        id: string;
        userId: string;
    }>;
    setAvailability(userId: string, slots: any[], overrides?: any[]): Promise<{
        slots: {
            id: string;
            startTime: string;
            endTime: string;
            availabilityId: string;
            dayOfWeek: number;
        }[];
        overrides: {
            id: string;
            startTime: string | null;
            endTime: string | null;
            availabilityId: string;
            date: string;
            isAvailable: boolean;
        }[];
    } & {
        id: string;
        userId: string;
    }>;
    getHostAvailabilityForDate(hostId: string, date: Date): Promise<{
        id: string;
        startTime: string;
        endTime: string;
        availabilityId: string;
        dayOfWeek: number;
    }[] | {
        startTime: string;
        endTime: string;
    }[]>;
}
