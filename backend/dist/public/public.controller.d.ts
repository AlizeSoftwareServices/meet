import { PublicService } from './public.service';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
export declare class PublicController {
    private readonly publicService;
    private readonly bookingsService;
    constructor(publicService: PublicService, bookingsService: BookingsService);
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
        }[];
    }>;
    getAvailableSlots(username: string, eventSlug: string, date: string, timezone: string): Promise<{
        startTime: string;
        endTime: string;
    }[]>;
    createBooking(dto: CreateBookingDto): Promise<any>;
}
