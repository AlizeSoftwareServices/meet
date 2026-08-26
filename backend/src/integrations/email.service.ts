import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createEvent, EventAttributes } from 'ics';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : null);
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`[EmailService] Initialized SMTP transporter with host: ${host}`);
    } else {
      this.logger.log(`[EmailService] No SMTP credentials provided. Running in dev mock mode.`);
    }
  }

  private getFromAddress(): string {
    return process.env.EMAIL_FROM || process.env.GMAIL_USER || 'Meet <no-reply@meet.com>';
  }

  private async sendMail(to: string, subject: string, htmlContent: string, attachments?: any[]) {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.getFromAddress(),
          to,
          subject,
          html: htmlContent,
          attachments,
        });
        this.logger.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        this.logger.error(`[EmailService] Failed to send email via SMTP: ${error.message}`);
      }
    }

    // Dev fallback log
    this.logger.log(`---------------- [MOCK EMAIL] ----------------`);
    this.logger.log(`To: ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Content:\n${htmlContent.replace(/<[^>]*>?/gm, ' ').trim().slice(0, 300)}...`);
    if (attachments && attachments.length > 0) {
      this.logger.log(`Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    }
    this.logger.log(`-----------------------------------------------`);
    return { success: true, mock: true };
  }

  private getBaseTemplate(title: string, contentHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
          .logo { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
          .logo span { color: #38bdf8; }
          .content { padding: 32px; }
          .title { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
          .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
          .detail-item { margin-bottom: 12px; font-size: 14px; }
          .detail-item:last-child { margin-bottom: 0; }
          .label { font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
          .value { color: #0f172a; font-size: 15px; margin-top: 2px; font-weight: 500; }
          .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 8px; text-decoration: none; margin-top: 12px; }
          .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Meet</div>
          </div>
          <div class="content">
            <h1 class="title">${title}</h1>
            ${contentHtml}
          </div>
          <div class="footer">
            Sent by Meet • Effortless Meeting Scheduling
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendBookingConfirmation(email: string, guestName: string, eventTitle: string, startTime: string, meetLink?: string, duration: number = 30, hostName: string = 'Host', hostEmail?: string) {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);
    const formattedDate = start.toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <p>Hello <strong>${guestName}</strong>,</p>
      <p>Your meeting has been successfully confirmed!</p>
      
      <div class="details-card">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${eventTitle}</div>
        </div>
        <div class="detail-item">
          <div class="label">Date & Time</div>
          <div class="value">${formattedDate}</div>
        </div>
        ${meetLink ? `
        <div class="detail-item">
          <div class="label">Join Meeting</div>
          <div class="value"><a href="${meetLink}" target="_blank" style="color: #2563eb;">${meetLink}</a></div>
        </div>
        ` : ''}
      </div>

      ${meetLink ? `<a href="${meetLink}" class="button" target="_blank">Join Meeting</a>` : ''}
    `;

    // Generate .ics attachment
    let attachments: any[] | undefined = undefined;
    try {
      const icsPromise = new Promise<string>((resolve, reject) => {
        const event: EventAttributes = {
          start: [start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes()],
          end: [end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), end.getUTCHours(), end.getUTCMinutes()],
          title: `${eventTitle}: ${guestName}`,
          description: `Meeting with ${guestName}.${meetLink ? `\nJoin with Google Meet: ${meetLink}` : ''}`,
          location: meetLink || 'Google Meet',
          organizer: { name: hostName, email: hostEmail || 'no-reply@meet.com' },
          status: 'CONFIRMED'
        };
        createEvent(event, (err, val) => (err ? reject(err) : resolve(val)));
      });
      const ics = await icsPromise;
      attachments = [{ filename: 'invite.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=REQUEST' }];
    } catch (e) {
      this.logger.warn('Failed to generate .ics invite attachment');
    }

    return this.sendMail(email, `Confirmed: ${eventTitle} with Meet`, this.getBaseTemplate('Meeting Confirmed', content), attachments);
  }

  async sendCancellationEmail(email: string, guestName: string, eventTitle: string, reason?: string) {
    const content = `
      <p>Hello <strong>${guestName}</strong>,</p>
      <p>Your meeting <strong>${eventTitle}</strong> has been cancelled.</p>
      
      <div class="details-card" style="border-left: 4px solid #ef4444;">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${eventTitle}</div>
        </div>
        ${reason ? `
        <div class="detail-item">
          <div class="label">Reason</div>
          <div class="value">${reason}</div>
        </div>
        ` : ''}
      </div>

      <p style="font-size: 14px; color: #64748b;">If you wish to re-book, please visit the host's booking link.</p>
    `;

    return this.sendMail(email, `Cancelled: ${eventTitle}`, this.getBaseTemplate('Meeting Cancelled', content));
  }

  async sendRescheduleEmail(email: string, guestName: string, eventTitle: string, newStartTime: string, meetLink?: string) {
    const formattedDate = new Date(newStartTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <p>Hello <strong>${guestName}</strong>,</p>
      <p>Your meeting <strong>${eventTitle}</strong> has been rescheduled to a new time.</p>
      
      <div class="details-card" style="border-left: 4px solid #f59e0b;">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${eventTitle}</div>
        </div>
        <div class="detail-item">
          <div class="label">New Date & Time</div>
          <div class="value">${formattedDate}</div>
        </div>
        ${meetLink ? `
        <div class="detail-item">
          <div class="label">Join Meeting</div>
          <div class="value"><a href="${meetLink}" target="_blank" style="color: #2563eb;">${meetLink}</a></div>
        </div>
        ` : ''}
      </div>

      ${meetLink ? `<a href="${meetLink}" class="button" target="_blank">Join Meeting</a>` : ''}
    `;

    return this.sendMail(email, `Rescheduled: ${eventTitle}`, this.getBaseTemplate('Meeting Rescheduled', content));
  }

  async sendReminderEmail(email: string, guestName: string, eventTitle: string, startTime: string, meetLink?: string) {
    const formattedDate = new Date(startTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <p>Hello <strong>${guestName}</strong>,</p>
      <p>This is a friendly reminder for your upcoming meeting.</p>
      
      <div class="details-card">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${eventTitle}</div>
        </div>
        <div class="detail-item">
          <div class="label">Time</div>
          <div class="value">${formattedDate}</div>
        </div>
        ${meetLink ? `
        <div class="detail-item">
          <div class="label">Join Link</div>
          <div class="value"><a href="${meetLink}" target="_blank" style="color: #2563eb;">${meetLink}</a></div>
        </div>
        ` : ''}
      </div>

      ${meetLink ? `<a href="${meetLink}" class="button" target="_blank">Join Meeting</a>` : ''}
    `;

    return this.sendMail(email, `Reminder: ${eventTitle} coming up soon`, this.getBaseTemplate('Meeting Reminder', content));
  }
}
