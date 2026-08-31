import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createEvent, EventAttributes } from 'ics';

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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Mail Transporter initialized with host: ${host}`);
    } else {
      this.logger.warn('SMTP credentials not provided in .env. Email sending will fail.');
    }
  }

  /**
   * Generate iCalendar (.ics) string for the meeting
   */
  private generateICS(data: BookingEmailData): Promise<string> {
    return new Promise((resolve, reject) => {
      const start = data.startTime;
      const end = data.endTime;

      const event: EventAttributes = {
        start: [
          start.getUTCFullYear(),
          start.getUTCMonth() + 1,
          start.getUTCDate(),
          start.getUTCHours(),
          start.getUTCMinutes(),
        ],
        end: [
          end.getUTCFullYear(),
          end.getUTCMonth() + 1,
          end.getUTCDate(),
          end.getUTCHours(),
          end.getUTCMinutes(),
        ],
        title: `${data.eventTitle}: ${data.guestName} and ${data.hostName}`,
        description: `Meeting with ${data.guestName} (${data.guestEmail}).${
          data.meetLink ? `\nJoin with Google Meet: ${data.meetLink}` : ''
        }`,
        location: data.meetLink || data.location || 'Google Meet',
        organizer: { name: data.hostName, email: data.hostEmail },
        attendees: [
          { name: data.hostName, email: data.hostEmail, rsvp: true },
          { name: data.guestName, email: data.guestEmail, rsvp: true },
        ],
        status: 'CONFIRMED',
      };

      createEvent(event, (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  }

  /**
   * Send booking confirmation with .ics attachment to Host and Guest
   */
  async sendBookingConfirmation(data: BookingEmailData) {
    try {
      const icsContent = await this.generateICS(data);
      const formattedDate = data.startTime.toUTCString();

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #0066FF;">Your Meeting is Confirmed!</h2>
          <p>Hi <strong>${data.guestName}</strong>,</p>
          <p>Your meeting with <strong>${data.hostName}</strong> has been scheduled successfully.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Event:</strong> ${data.eventTitle}</p>
            <p><strong>Date & Time:</strong> ${formattedDate}</p>
            <p><strong>Location:</strong> ${data.meetLink ? `<a href="${data.meetLink}">${data.meetLink}</a>` : data.location || 'Google Meet'}</p>
          </div>

          <p style="color: #64748b; font-size: 13px;">A calendar invitation (.ics) is attached to this email. You can add it directly to your calendar.</p>
        </div>
      `;

      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"Meet" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: [data.guestEmail, data.hostEmail],
          subject: `Confirmed: ${data.eventTitle} with ${data.hostName} on ${data.startTime.toLocaleDateString()}`,
          html: htmlContent,
          attachments: [
            {
              filename: 'invite.ics',
              content: icsContent,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
            },
          ],
        });
        this.logger.log(`Booking confirmation email sent to ${data.guestEmail} and ${data.hostEmail}`);
      } else {
        throw new InternalServerErrorException('SMTP credentials are not configured. Cannot send email.');
      }
    } catch (err) {
      this.logger.error('Failed to send booking confirmation email', err);
    }
  }

  /**
   * Send cancellation notification to Host and Guest
   */
  async sendCancellationNotification(data: BookingEmailData) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px;">
          <h2 style="color: #ef4444;">Meeting Cancelled</h2>
          <p>The following meeting has been cancelled:</p>
          
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Event:</strong> ${data.eventTitle}</p>
            <p><strong>Participants:</strong> ${data.hostName} & ${data.guestName}</p>
            ${data.cancelReason ? `<p><strong>Reason:</strong> ${data.cancelReason}</p>` : ''}
          </div>
        </div>
      `;

      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"Meet" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: [data.guestEmail, data.hostEmail],
          subject: `Cancelled: ${data.eventTitle} with ${data.hostName}`,
          html: htmlContent,
        });
      } else {
        throw new InternalServerErrorException('SMTP credentials are not configured. Cannot send email.');
      }
    } catch (err) {
      this.logger.error('Failed to send cancellation email', err);
    }
  }
}
