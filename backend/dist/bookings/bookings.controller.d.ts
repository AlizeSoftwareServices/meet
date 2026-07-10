import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(createBookingDto: CreateBookingDto): Promise<any>;
    getHostBookings(req: any): Promise<({
        eventType: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guestName: string;
        guestEmail: string;
        guestPhone: string | null;
        guestCompany: string | null;
        guestNotes: string | null;
        startTime: Date;
        endTime: Date;
        status: string;
        cancelReason: string | null;
        meetLink: string | null;
        eventTypeId: string;
        hostId: string;
    })[]>;
    cancelBooking(id: string, reason: string, req: any): Promise<{
        eventType: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guestName: string;
        guestEmail: string;
        guestPhone: string | null;
        guestCompany: string | null;
        guestNotes: string | null;
        startTime: Date;
        endTime: Date;
        status: string;
        cancelReason: string | null;
        meetLink: string | null;
        eventTypeId: string;
        hostId: string;
    }>;
    rescheduleBooking(id: string, newStartTime: string, newEndTime: string, req: any): Promise<{
        eventType: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guestName: string;
        guestEmail: string;
        guestPhone: string | null;
        guestCompany: string | null;
        guestNotes: string | null;
        startTime: Date;
        endTime: Date;
        status: string;
        cancelReason: string | null;
        meetLink: string | null;
        eventTypeId: string;
        hostId: string;
    }>;
}
