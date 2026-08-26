"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let CalendarService = CalendarService_1 = class CalendarService {
    prisma;
    logger = new common_1.Logger(CalendarService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    getOAuth2Client() {
        return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID || 'mock_client_id', process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret', process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback');
    }
    async createCalendarEvent(hostId, hostEmail, guestEmail, startTime, endTime, title) {
        try {
            const googleIntegration = await this.prisma.integration.findUnique({
                where: { userId_provider: { userId: hostId, provider: 'google' } }
            });
            if (googleIntegration) {
                const oauth2Client = this.getOAuth2Client();
                oauth2Client.setCredentials({
                    access_token: googleIntegration.accessToken,
                    refresh_token: googleIntegration.refreshToken,
                });
                const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                const event = {
                    summary: title,
                    start: { dateTime: startTime },
                    end: { dateTime: endTime },
                    attendees: [{ email: guestEmail }, { email: hostEmail }],
                    conferenceData: {
                        createRequest: {
                            requestId: `MeetSync-${Date.now()}`,
                            conferenceSolutionKey: { type: 'hangoutsMeet' },
                        },
                    },
                };
                const response = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: event,
                    conferenceDataVersion: 1,
                });
                this.logger.log(`[GOOGLE CALENDAR EVENT] Created for ${hostEmail} and ${guestEmail}`);
                return {
                    meetLink: response.data.hangoutLink || 'https://meet.google.com/mock-link-xyz',
                    eventId: response.data.id || 'mock-event-id-123'
                };
            }
        }
        catch (error) {
            this.logger.error(`Failed to create Google Calendar event: ${error.message}`);
        }
        try {
            const microsoftIntegration = await this.prisma.integration.findUnique({
                where: { userId_provider: { userId: hostId, provider: 'microsoft' } }
            });
            if (microsoftIntegration) {
                return await this.createMicrosoftEvent(microsoftIntegration.accessToken, hostEmail, guestEmail, startTime, endTime, title);
            }
        }
        catch (error) {
            this.logger.error(`Failed to find Microsoft integration: ${error.message}`);
        }
        this.logger.warn(`No active integrations found for host ${hostEmail}. Falling back to mock.`);
        return this.mockCreateEvent(hostEmail, guestEmail, startTime, endTime, title);
    }
    async createMicrosoftEvent(accessToken, hostEmail, guestEmail, startTime, endTime, title) {
        try {
            const event = {
                subject: title,
                body: { contentType: "HTML", content: "Event created by MeetSync" },
                start: { dateTime: startTime, timeZone: "UTC" },
                end: { dateTime: endTime, timeZone: "UTC" },
                attendees: [
                    { emailAddress: { address: guestEmail, name: guestEmail }, type: "required" }
                ],
                isOnlineMeeting: true,
                onlineMeetingProvider: "teamsForBusiness"
            };
            const response = await axios_1.default.post('https://graph.microsoft.com/v1.0/me/events', event, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            this.logger.log(`[MICROSOFT EVENT] Created for ${hostEmail} and ${guestEmail}`);
            return {
                meetLink: response.data.onlineMeeting?.joinUrl || 'https://teams.microsoft.com/mock-link-abc',
                eventId: response.data.id || 'mock-event-id-abc'
            };
        }
        catch (error) {
            this.logger.error(`Failed to create Microsoft event via Graph API: ${error.message}`);
            return this.mockCreateEvent(hostEmail, guestEmail, startTime, endTime, title);
        }
    }
    mockCreateEvent(hostEmail, guestEmail, startTime, endTime, title) {
        this.logger.log(`[MOCK CALENDAR EVENT] Created for ${hostEmail} and ${guestEmail}`);
        return {
            meetLink: 'https://meet.google.com/mock-link-xyz',
            eventId: 'mock-event-id-123'
        };
    }
    async getBusyPeriods(hostId, startTime, endTime) {
        const busyPeriods = [];
        try {
            const googleIntegration = await this.prisma.integration.findUnique({
                where: { userId_provider: { userId: hostId, provider: 'google' } }
            });
            if (googleIntegration && googleIntegration.checkConflicts) {
                const oauth2Client = this.getOAuth2Client();
                oauth2Client.setCredentials({
                    access_token: googleIntegration.accessToken,
                    refresh_token: googleIntegration.refreshToken,
                });
                const calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                const response = await calendar.freebusy.query({
                    requestBody: {
                        timeMin: startTime,
                        timeMax: endTime,
                        items: [{ id: 'primary' }],
                    }
                });
                const calendars = response.data.calendars;
                if (calendars && calendars.primary && calendars.primary.busy) {
                    for (const busy of calendars.primary.busy) {
                        if (busy.start && busy.end) {
                            busyPeriods.push({ start: new Date(busy.start), end: new Date(busy.end) });
                        }
                    }
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to fetch Google busy periods: ${error.message}`);
        }
        try {
            const microsoftIntegration = await this.prisma.integration.findUnique({
                where: { userId_provider: { userId: hostId, provider: 'microsoft' } }
            });
            if (microsoftIntegration && microsoftIntegration.checkConflicts) {
                this.logger.log('Microsoft two-way sync would fetch free/busy here.');
            }
        }
        catch (error) {
            this.logger.error(`Failed to fetch Microsoft busy periods: ${error.message}`);
        }
        return busyPeriods;
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = CalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map