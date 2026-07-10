export declare class EmailService {
    private readonly logger;
    sendBookingConfirmation(email: string, guestName: string, eventTitle: string, startTime: string): Promise<{
        success: boolean;
    }>;
}
