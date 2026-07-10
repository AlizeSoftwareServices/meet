import { AvailabilityService } from './availability.service';
export declare class AvailabilityController {
    private readonly availabilityService;
    constructor(availabilityService: AvailabilityService);
    getAvailability(req: any): Promise<{
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
    updateAvailability(req: any, slots: any[], overrides?: any[]): Promise<{
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
}
