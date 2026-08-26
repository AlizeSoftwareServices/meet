export interface BookingEmailData {
    hostName: string;
    hostEmail: string;
    guestName: string;
    guestEmail: string;
    eventTitle: string;
    startTime: Date;
    endTime: Date;
    meetLink?: string | null;
    location?: string | null;
    cancelReason?: string | null;
}
export declare class MailService {
    private readonly logger;
    private transporter;
    constructor();
    private generateICS;
    sendBookingConfirmation(data: BookingEmailData): Promise<void>;
    sendCancellationNotification(data: BookingEmailData): Promise<void>;
}
