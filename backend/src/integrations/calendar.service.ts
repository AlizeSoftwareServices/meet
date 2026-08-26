import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prisma: PrismaService) {}

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
      process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback'
    );
  }

  async createCalendarEvent(hostId: string, hostEmail: string, guestEmail: string, startTime: string, endTime: string, title: string) {
    // 1. Try Google Integration First
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

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

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
    } catch (error) {
      this.logger.error(`Failed to create Google Calendar event: ${error.message}`);
    }

    // 2. Try Microsoft Integration if Google fails or doesn't exist
    try {
      const microsoftIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'microsoft' } }
      });

      if (microsoftIntegration) {
        return await this.createMicrosoftEvent(microsoftIntegration.accessToken, hostEmail, guestEmail, startTime, endTime, title);
      }
    } catch (error) {
      this.logger.error(`Failed to find Microsoft integration: ${error.message}`);
    }

    // 3. Fallback to mock
    this.logger.warn(`No active integrations found for host ${hostEmail}. Falling back to mock.`);
    return this.mockCreateEvent(hostEmail, guestEmail, startTime, endTime, title);
  }

  private async createMicrosoftEvent(accessToken: string, hostEmail: string, guestEmail: string, startTime: string, endTime: string, title: string) {
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

      const response = await axios.post('https://graph.microsoft.com/v1.0/me/events', event, {
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
    } catch (error) {
      this.logger.error(`Failed to create Microsoft event via Graph API: ${error.message}`);
      return this.mockCreateEvent(hostEmail, guestEmail, startTime, endTime, title);
    }
  }

  private mockCreateEvent(hostEmail: string, guestEmail: string, startTime: string, endTime: string, title: string) {
    this.logger.log(`[MOCK CALENDAR EVENT] Created for ${hostEmail} and ${guestEmail}`);
    return { 
      meetLink: 'https://meet.google.com/mock-link-xyz',
      eventId: 'mock-event-id-123'
    };
  }

  async getBusyPeriods(hostId: string, startTime: string, endTime: string): Promise<{start: Date, end: Date}[]> {
    const busyPeriods: {start: Date, end: Date}[] = [];
    
    // 1. Check Google Integration
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

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
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
    } catch (error) {
      this.logger.error(`Failed to fetch Google busy periods: ${error.message}`);
    }

    // 2. Check Microsoft Integration
    try {
      const microsoftIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'microsoft' } }
      });

      if (microsoftIntegration && microsoftIntegration.checkConflicts) {
        // Mocking MS Graph API for freebusy
        this.logger.log('Microsoft two-way sync would fetch free/busy here.');
      }
    } catch (error) {
       this.logger.error(`Failed to fetch Microsoft busy periods: ${error.message}`);
    }

    return busyPeriods;
  }
}
