export declare class EmailService {
    private readonly logger;
    private transporter;
    constructor();
    private initTransporter;
    private getFromAddress;
    private sendMail;
    private getBaseTemplate;
    sendBookingConfirmation(email: string, guestName: string, eventTitle: string, startTime: string, meetLink?: string, duration?: number, hostName?: string, hostEmail?: string): Promise<{
        success: boolean;
        messageId: any;
        mock?: undefined;
    } | {
        success: boolean;
        mock: boolean;
        messageId?: undefined;
    }>;
    sendCancellationEmail(email: string, guestName: string, eventTitle: string, reason?: string): Promise<{
        success: boolean;
        messageId: any;
        mock?: undefined;
    } | {
        success: boolean;
        mock: boolean;
        messageId?: undefined;
    }>;
    sendRescheduleEmail(email: string, guestName: string, eventTitle: string, newStartTime: string, meetLink?: string): Promise<{
        success: boolean;
        messageId: any;
        mock?: undefined;
    } | {
        success: boolean;
        mock: boolean;
        messageId?: undefined;
    }>;
    sendReminderEmail(email: string, guestName: string, eventTitle: string, startTime: string, meetLink?: string): Promise<{
        success: boolean;
        messageId: any;
        mock?: undefined;
    } | {
        success: boolean;
        mock: boolean;
        messageId?: undefined;
    }>;
}
