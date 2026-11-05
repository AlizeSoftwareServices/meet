import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createEvent, EventAttributes } from 'ics';
import { escapeHtml } from '../common/security/security.util';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host =
      process.env.SMTP_HOST ||
      (process.env.GMAIL_USER ? 'smtp.gmail.com' : null);
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

    if (host && user && pass) {
      this.transporter = this.createTransporterInstance(host, port, user, pass);
      this.logger.log(
        `[EmailService] Initialized SMTP transporter with host: ${host}, port: ${port}`,
      );
    } else {
      this.logger.warn(
        `[EmailService] No SMTP credentials provided. Email sending will fail.`,
      );
    }
  }

  private createTransporterInstance(
    host: string,
    port: number,
    user: string,
    pass: string,
  ): nodemailer.Transporter {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
    });
  }

  private getFromAddress(): string {
    if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
    if (process.env.SMTP_USER) return `"Meet" <${process.env.SMTP_USER}>`;
    if (process.env.GMAIL_USER) return `"Meet" <${process.env.GMAIL_USER}>`;
    return 'Meet <no-reply@alizesoftwareservices.com>';
  }

  public getFrontendBaseUrl(): string {
    const envUrl = process.env.FRONTEND_URL?.trim();
    if (envUrl && envUrl.startsWith('http')) {
      return envUrl.replace(/\/$/, '');
    }
    return 'https://meet.alizesoftwareservices.com';
  }

  private async sendViaMeetMailBridge(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<{ success: boolean; messageId: string } | null> {
    const bridgeUrl =
      process.env.MEET_MAIL_BRIDGE_URL ||
      'https://alizesoftwareservices.com/meet-mail.php';
    const bridgeSecret =
      process.env.MEET_MAIL_BRIDGE_SECRET ||
      'MeetAlize_Secure_Mail_2026_z9q2';

    if (!bridgeUrl) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(bridgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bridge-Secret': bridgeSecret,
        },
        body: JSON.stringify({
          to,
          name: 'User',
          subject,
          html: htmlContent,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        if (data && data.success) {
          this.logger.log(
            `[EmailService] Email delivered via Meet Mail Bridge to ${to}. MessageId: ${data.messageId}`,
          );
          return {
            success: true,
            messageId: data.messageId || 'meet-mail-sent',
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `[EmailService] Meet mail bridge attempt failed (${err.message}). Falling back to direct SMTP...`,
      );
    }
    return null;
  }

  private async sendMail(
    to: string,
    subject: string,
    htmlContent: string,
    attachments?: any[],
  ) {
    // Strategy 1: Dedicated Meet Mail Bridge (Port 443 HTTPS - Ultra-fast & reliable on Render Cloud)
    if (!attachments || attachments.length === 0) {
      const bridgeResult = await this.sendViaMeetMailBridge(
        to,
        subject,
        htmlContent,
      );
      if (bridgeResult) {
        return bridgeResult;
      }
    }

    const host =
      process.env.SMTP_HOST ||
      (process.env.GMAIL_USER ? 'smtp.gmail.com' : null);
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

    if (!this.transporter) {
      if (host && user && pass) {
        this.transporter = this.createTransporterInstance(host, port, user, pass);
      } else {
        throw new InternalServerErrorException(
          'SMTP credentials are not configured. Cannot send email.',
        );
      }
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject,
        html: htmlContent,
        attachments,
      });
      this.logger.log(
        `[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`,
      );
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.warn(
        `[EmailService] Primary SMTP attempt failed (${host}:${port}): ${error.message}`,
      );

      // Automatic fallback: If port was 465, try port 587 (STARTTLS). If port was 587, try 465 (SSL).
      if (host && user && pass) {
        const altPort = port === 465 ? 587 : 465;
        try {
          this.logger.log(
            `[EmailService] Attempting automatic fallback via ${host}:${altPort}...`,
          );
          const fallbackTransporter = this.createTransporterInstance(
            host,
            altPort,
            user,
            pass,
          );
          const info = await fallbackTransporter.sendMail({
            from: this.getFromAddress(),
            to,
            subject,
            html: htmlContent,
            attachments,
          });
          this.logger.log(
            `[EmailService] Email sent via fallback port ${altPort} to ${to}. MessageId: ${info.messageId}`,
          );
          this.transporter = fallbackTransporter;
          return { success: true, messageId: info.messageId };
        } catch (fallbackError: any) {
          this.logger.error(
            `[EmailService] Fallback SMTP attempt failed (${host}:${altPort}): ${fallbackError.message}`,
          );
        }
      }

      throw new InternalServerErrorException(`Failed to send email via SMTP: ${error.message}`);
    }
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
          <div class="header" style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px 32px; color: #ffffff;">
            <div class="logo">Meet <span style="font-size: 13px; font-weight: 500; opacity: 0.85; margin-left: 6px;">by Alize</span></div>
          </div>
          <div class="content">
            <h1 class="title">${title}</h1>
            ${contentHtml}
          </div>
          <div class="footer">
            Sent securely by Meet • <a href="https://meet.alizesoftwareservices.com" style="color: #64748b; text-decoration: underline;">meet.alizesoftwareservices.com</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendBookingConfirmation(
    email: string,
    guestName: string,
    eventTitle: string,
    startTime: string,
    meetLink?: string,
    duration: number = 30,
    hostName: string = 'Host',
    hostEmail?: string,
    cancelToken?: string,
    rescheduleToken?: string,
  ) {
    const safeGuest = escapeHtml(guestName);
    const safeEvent = escapeHtml(eventTitle);
    const safeHost = escapeHtml(hostName);
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);
    const formattedDate = start.toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <p>Hello <strong>${safeGuest}</strong>,</p>
      <p>Your meeting has been successfully confirmed!</p>
      
      <div class="details-card">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${safeEvent}</div>
        </div>
        <div class="detail-item">
          <div class="label">Date & Time</div>
          <div class="value">${formattedDate}</div>
        </div>
        ${
          meetLink
            ? `
        <div class="detail-item">
          <div class="label">Join Meeting</div>
          <div class="value"><a href="${meetLink}" target="_blank" style="color: #2563eb;">${meetLink}</a></div>
        </div>
        `
            : ''
        }
      </div>

      ${meetLink ? `<a href="${meetLink}" class="button" target="_blank">Join Meeting</a>` : ''}

      ${
        cancelToken || rescheduleToken
          ? `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px;">
          <p style="margin-bottom: 8px;">Need to make changes?</p>
          ${rescheduleToken ? `<a href="${this.getFrontendBaseUrl()}/guest/reschedule?token=${rescheduleToken}" style="color: #64748b; text-decoration: underline; margin-right: 12px;">Reschedule</a>` : ''}
          ${cancelToken ? `<a href="${this.getFrontendBaseUrl()}/guest/cancel?token=${cancelToken}" style="color: #64748b; text-decoration: underline;">Cancel</a>` : ''}
        </div>
      `
          : ''
      }
    `;

    // Generate .ics attachment
    let attachments: any[] | undefined = undefined;
    try {
      const icsPromise = new Promise<string>((resolve, reject) => {
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
          title: `${eventTitle}: ${guestName}`,
          description: `Meeting with ${guestName}.${meetLink ? `\nJoin with Google Meet: ${meetLink}` : ''}`,
          location: meetLink || 'Google Meet',
          organizer: {
            name: hostName,
            email: hostEmail || 'no-reply@meet.com',
          },
          status: 'CONFIRMED',
        };
        createEvent(event, (err, val) => (err ? reject(err) : resolve(val)));
      });
      const ics = await icsPromise;
      attachments = [
        {
          filename: 'invite.ics',
          content: ics,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ];
    } catch (e) {
      this.logger.warn('Failed to generate .ics invite attachment');
    }

    return this.sendMail(
      email,
      `Confirmed: ${eventTitle} with Meet`,
      this.getBaseTemplate('Meeting Confirmed', content),
      attachments,
    );
  }

  async sendCancellationEmail(
    email: string,
    guestName: string,
    eventTitle: string,
    reason?: string,
  ) {
    const safeGuest = escapeHtml(guestName);
    const safeEvent = escapeHtml(eventTitle);
    const safeReason = reason ? escapeHtml(reason) : '';
    const content = `
      <p>Hello <strong>${safeGuest}</strong>,</p>
      <p>Your meeting <strong>${safeEvent}</strong> has been cancelled.</p>
      
      <div class="details-card" style="border-left: 4px solid #ef4444;">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${safeEvent}</div>
        </div>
        ${
          safeReason
            ? `
        <div class="detail-item">
          <div class="label">Reason</div>
          <div class="value">${safeReason}</div>
        </div>
        `
            : ''
        }
      </div>

      <p style="font-size: 14px; color: #64748b;">If you wish to re-book, please visit the host's booking link.</p>
    `;

    return this.sendMail(
      email,
      `Cancelled: ${eventTitle}`,
      this.getBaseTemplate('Meeting Cancelled', content),
    );
  }

  async sendRescheduleEmail(
    email: string,
    guestName: string,
    eventTitle: string,
    newStartTime: string,
    meetLink?: string,
    cancelToken?: string,
    rescheduleToken?: string,
  ) {
    const safeGuest = escapeHtml(guestName);
    const safeEvent = escapeHtml(eventTitle);
    const formattedDate = new Date(newStartTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <p>Hello <strong>${safeGuest}</strong>,</p>
      <p>Your meeting <strong>${safeEvent}</strong> has been rescheduled to a new time.</p>
      
      <div class="details-card" style="border-left: 4px solid #f59e0b;">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${safeEvent}</div>
        </div>
        <div class="detail-item">
          <div class="label">New Date & Time</div>
          <div class="value">${formattedDate}</div>
        </div>
        ${
          meetLink
            ? `
        <div class="detail-item">
          <div class="label">Join Meeting</div>
          <div class="value"><a href="${meetLink}" target="_blank" style="color: #2563eb;">${meetLink}</a></div>
        </div>
        `
            : ''
        }
      </div>

      ${meetLink ? `<a href="${meetLink}" class="button" target="_blank">Join Meeting</a>` : ''}

      ${
        cancelToken || rescheduleToken
          ? `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px;">
          <p style="margin-bottom: 8px;">Need to make changes?</p>
          ${rescheduleToken ? `<a href="${this.getFrontendBaseUrl()}/guest/reschedule?token=${rescheduleToken}" style="color: #64748b; text-decoration: underline; margin-right: 12px;">Reschedule</a>` : ''}
          ${cancelToken ? `<a href="${this.getFrontendBaseUrl()}/guest/cancel?token=${cancelToken}" style="color: #64748b; text-decoration: underline;">Cancel</a>` : ''}
        </div>
      `
          : ''
      }
    `;

    return this.sendMail(
      email,
      `Rescheduled: ${eventTitle}`,
      this.getBaseTemplate('Meeting Rescheduled', content),
    );
  }

  async sendReminderEmail(
    email: string,
    guestName: string,
    eventTitle: string,
    startTime: string,
    meetLink?: string,
  ) {
    const safeGuest = escapeHtml(guestName);
    const safeEvent = escapeHtml(eventTitle);
    const formattedDate = new Date(startTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <p>Hello <strong>${safeGuest}</strong>,</p>
      <p>This is a friendly reminder for your upcoming meeting.</p>
      
      <div class="details-card">
        <div class="detail-item">
          <div class="label">Event</div>
          <div class="value">${safeEvent}</div>
        </div>
        <div class="detail-item">
          <div class="label">Time</div>
          <div class="value">${formattedDate}</div>
        </div>
        ${
          meetLink
            ? `
        <div class="detail-item">
          <div class="label">Join Link</div>
          <div class="value"><a href="${meetLink}" target="_blank" style="color: #2563eb;">${meetLink}</a></div>
        </div>
        `
            : ''
        }
      </div>

      ${meetLink ? `<a href="${meetLink}" class="button" target="_blank">Join Meeting</a>` : ''}
    `;

    return this.sendMail(
      email,
      `Reminder: ${eventTitle} coming up soon`,
      this.getBaseTemplate('Meeting Reminder', content),
    );
  }

  async sendFollowUpEmail(
    email: string,
    guestName: string,
    eventTitle: string,
  ) {
    const safeGuest = escapeHtml(guestName);
    const safeEvent = escapeHtml(eventTitle);
    const content = `
      <p>Hello <strong>${safeGuest}</strong>,</p>
      <p>Thank you for attending the <strong>${safeEvent}</strong> meeting.</p>
      <p>We hope it was productive. If you have any follow-up questions, feel free to reply or book another session.</p>
    `;

    return this.sendMail(
      email,
      `Follow-up: ${eventTitle}`,
      this.getBaseTemplate('Thank You for Attending', content),
    );
  }

  async sendCustomWorkflowEmail(
    email: string,
    guestName: string,
    eventTitle: string,
    startTime: string,
    meetLink?: string,
    customSubject?: string | null,
    customBody?: string | null,
  ) {
    const safeGuest = escapeHtml(guestName);
    const safeEvent = escapeHtml(eventTitle);
    const formattedDate = new Date(startTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const vars: Record<string, string> = {
      guest_name: safeGuest,
      event_title: safeEvent,
      start_time: formattedDate,
      meeting_link: meetLink || '',
    };

    const interpolate = (tpl: string) =>
      tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

    const subject = customSubject
      ? interpolate(customSubject)
      : `Reminder: ${safeEvent}`;

    const bodyContent = customBody
      ? `<div style="font-size: 15px; leading: 1.6;">${interpolate(customBody).replace(/\n/g, '<br/>')}</div>`
      : `
        <p>Hello <strong>${safeGuest}</strong>,</p>
        <p>This is a friendly reminder for your upcoming meeting: <strong>${safeEvent}</strong>.</p>
        <p>Time: ${formattedDate}</p>
        ${meetLink ? `<p><a href="${meetLink}">Join Meeting</a></p>` : ''}
      `;

    return this.sendMail(
      email,
      subject,
      this.getBaseTemplate(safeEvent, bodyContent),
    );
  }

  async sendPasswordResetEmail(email: string, name: string, tokenUrl: string) {
    const safeName = escapeHtml(name);
    const content = `
      <p style="font-size: 15px; margin-bottom: 16px;">Hello <strong>${safeName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
        We received a request to reset the password for your Meet account. If you initiated this request, click the button below to choose a new password:
      </p>
      
      <div style="text-align: center; margin: 28px 0;">
        <a href="${tokenUrl}" class="button" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; font-size: 15px; font-weight: 700; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
          Reset Password
        </a>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 24px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        <strong style="color: #0f172a;">Important Security Information:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>This link is strictly valid for <strong>1 hour</strong> and can only be used once.</li>
          <li>If you did not request a password reset, you can safely ignore this email — your account remains safe and secure.</li>
        </ul>
      </div>

      <p style="font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px; line-height: 1.5;">
        Having trouble clicking the button? Copy and paste the following URL into your web browser:<br/>
        <a href="${tokenUrl}" style="color: #2563eb; text-decoration: underline;">${tokenUrl}</a>
      </p>
    `;
    return this.sendMail(
      email,
      `Reset Your Password - Meet`,
      this.getBaseTemplate('Reset Your Password', content),
    );
  }

  async sendVerificationEmail(email: string, name: string, tokenUrl: string) {
    const safeName = escapeHtml(name);
    const content = `
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Welcome to Meet! Please verify your email address to secure your account.</p>
      
      <p>Click the button below to verify your email. This link will expire in 24 hours.</p>
      
      <a href="${tokenUrl}" class="button" target="_blank">Verify Email</a>
    `;
    return this.sendMail(
      email,
      `Verify Your Email`,
      this.getBaseTemplate('Email Verification', content),
    );
  }

  async sendWelcomeEmail(email: string, name: string) {
    const safeName = escapeHtml(name);
    const content = `
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>You have successfully signed up in Meet!</p>
      <p>We're excited to have you on board. Start scheduling your meetings effortlessly.</p>
      <a href="${this.getFrontendBaseUrl()}/dashboard" class="button" target="_blank">Go to Dashboard</a>
    `;
    return this.sendMail(
      email,
      'Welcome to Meet!',
      this.getBaseTemplate('Registration Successful', content),
    );
  }

  async sendHostNotificationEmail(
    hostEmail: string,
    guestName: string,
    eventTitle: string,
    status: string,
    startTime?: string,
  ) {
    const safeGuest = escapeHtml(guestName);
    const safeEvent = escapeHtml(eventTitle);
    let subject = '';
    let message = '';

    switch (status) {
      case 'CANCELLED':
        subject = `Canceled: ${safeEvent} with ${safeGuest}`;
        message = `The booking for ${safeEvent} with ${safeGuest} has been canceled by the guest.`;
        break;
      case 'RESCHEDULED':
        subject = `Rescheduled: ${safeEvent} with ${safeGuest}`;
        message = `The booking for ${safeEvent} with ${safeGuest} has been rescheduled to ${new Date(startTime!).toLocaleString()}.`;
        break;
      default:
        return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>${message}</p>
      </div>
    `;

    return this.sendMail(hostEmail, subject, htmlContent);
  }

  async sendTeamInvitationEmail(
    email: string,
    teamName: string,
    token: string,
  ) {
    const safeTeam = escapeHtml(teamName);
    const subject = `You've been invited to join ${safeTeam} on Meet`;
    const acceptUrl = `${this.getFrontendBaseUrl()}/guest/invitation?token=${token}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2>Join ${safeTeam}</h2>
        <p>You have been invited to join the team <strong>${safeTeam}</strong>.</p>
        <p>Click the button below to accept your invitation:</p>
        <div style="margin: 30px 0;">
          <a href="${acceptUrl}" style="background-color: #006bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `;

    return this.sendMail(email, subject, htmlContent);
  }

  async sendRegistrationOtp(email: string, otp: string) {
    const subject = `Your Meet Verification Code: ${otp}`;
    const content = `
      <p>Hello,</p>
      <p>Thank you for signing up for <strong>Meet</strong>. To verify your email address, please enter the following 6-digit verification code:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4338ca; background: #eef2ff; padding: 14px 28px; border-radius: 12px; display: inline-block; font-family: monospace; border: 1px solid #c7d2fe;">${otp}</span>
      </div>

      <p style="font-size: 14px; color: #475569; text-align: center;">This code will expire in <strong>5 minutes</strong>. For your security, never share this code with anyone.</p>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 25px;">If you did not initiate this request, you can safely ignore this email.</p>
    `;

    return this.sendMail(
      email,
      subject,
      this.getBaseTemplate('Email Verification Code', content),
    );
  }
}
