"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
const ics_1 = require("ics");
let MailService = MailService_1 = class MailService {
    logger = new common_1.Logger(MailService_1.name);
    transporter;
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
        }
        else {
            this.logger.warn('SMTP credentials not provided in .env. Emails will be logged to console.');
        }
    }
    generateICS(data) {
        return new Promise((resolve, reject) => {
            const start = data.startTime;
            const end = data.endTime;
            const event = {
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
                description: `Meeting with ${data.guestName} (${data.guestEmail}).${data.meetLink ? `\nJoin with Google Meet: ${data.meetLink}` : ''}`,
                location: data.meetLink || data.location || 'Google Meet',
                organizer: { name: data.hostName, email: data.hostEmail },
                attendees: [
                    { name: data.hostName, email: data.hostEmail, rsvp: true },
                    { name: data.guestName, email: data.guestEmail, rsvp: true },
                ],
                status: 'CONFIRMED',
            };
            (0, ics_1.createEvent)(event, (error, value) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(value);
                }
            });
        });
    }
    async sendBookingConfirmation(data) {
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
            }
            else {
                this.logger.log(`[Email Mock Sent] To: ${data.guestEmail}, Event: ${data.eventTitle}`);
            }
        }
        catch (err) {
            this.logger.error('Failed to send booking confirmation email', err);
        }
    }
    async sendCancellationNotification(data) {
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
            }
            else {
                this.logger.log(`[Email Mock Cancelled] To: ${data.guestEmail}`);
            }
        }
        catch (err) {
            this.logger.error('Failed to send cancellation email', err);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MailService);
//# sourceMappingURL=mail.service.js.map