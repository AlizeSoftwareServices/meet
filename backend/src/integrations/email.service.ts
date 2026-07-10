import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendBookingConfirmation(email: string, guestName: string, eventTitle: string, startTime: string) {
    // In production, this would use the Resend SDK
    // const { data, error } = await resend.emails.send({ ... });
    this.logger.log(`[MOCK EMAIL SENT] To: ${email} | Subject: Booking Confirmed for ${eventTitle}`);
    this.logger.log(`Hello ${guestName}, your meeting "${eventTitle}" is scheduled for ${startTime}.`);
    
    return { success: true };
  }
}
