import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prisma: PrismaService) {}

  private getOAuth2Client() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new InternalServerErrorException('Google OAuth credentials are not configured.');
    }
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  private async getGoogleCalendarClient(hostId: string) {
    const googleIntegration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId: hostId, provider: 'google' } }
    });

    if (!googleIntegration) return null;

    const oauth2Client = this.getOAuth2Client();

    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
          await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: {
              accessToken: tokens.access_token,
              ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
            }
          }).catch(err => this.logger.error(`Failed to save refreshed Google tokens: ${err.message}`));
      }
    });

    oauth2Client.setCredentials({
      access_token: googleIntegration.accessToken,
      refresh_token: googleIntegration.refreshToken,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  // Helper for Microsoft to auto-refresh tokens
  private async microsoftGraphRequest(hostId: string, method: string, url: string, data?: any): Promise<any> {
    let integration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId: hostId, provider: 'microsoft' } }
    });

    if (!integration) return null;

    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data !== "" ? response.data : true;
    } catch (error: any) {
      if (error.response?.status === 401 && integration.refreshToken) {
        // Try refresh
        try {
          const clientId = process.env.MICROSOFT_CLIENT_ID;
          const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
          
          if (!clientId || !clientSecret) throw new Error('Missing Microsoft credentials');

          const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
            new URLSearchParams({
              client_id: clientId,
              scope: 'offline_access Calendars.ReadWrite',
              refresh_token: integration.refreshToken,
              grant_type: 'refresh_token',
              client_secret: clientSecret
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          
          const newAccessToken = tokenResponse.data.access_token;
          const newRefreshToken = tokenResponse.data.refresh_token || integration.refreshToken;
          
          await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'microsoft' } },
            data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
          });

          // Retry request with new token
          const retryResponse = await axios({
            method,
            url,
            data,
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json'
            }
          });
          return retryResponse.data !== "" ? retryResponse.data : true;
        } catch (refreshErr: any) {
          this.logger.error(`Failed to refresh Microsoft token: ${refreshErr.message}`);
          await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'microsoft' } },
            data: { accessToken: 'EXPIRED' }
          }).catch(() => {});
          throw new BadRequestException('Microsoft calendar token expired and refresh failed. Please reconnect.');
        }
      }
      this.logger.error(`Microsoft Graph API error [${method} ${url}]: ${error.message}`);
      throw error;
    }
  }

  async createCalendarEvent(hostId: string, hostEmail: string, guestEmail: string, startTime: string, endTime: string, title: string) {
    // 1. Try Google Integration First
    try {
      const calendar = await this.getGoogleCalendarClient(hostId);
      if (calendar) {
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
        
        const meetLink = response.data.hangoutLink;
        const externalEventId = response.data.id;
        
        if (!meetLink || !externalEventId) {
           throw new BadRequestException('Google Calendar created the event but failed to generate a Meet link or Event ID.');
        }

        return { 
          meetLink: meetLink,
          eventId: externalEventId
        };
      }
    } catch (error: any) {
      this.logger.error(`Failed to create Google Calendar event: ${error.message}`);
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
         await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' }
         }).catch(() => {});
      }
      throw new BadRequestException('Failed to create external Google Calendar event. Token may be expired or revoked. Please reconnect.');
    }

    // 2. Try Microsoft Integration if Google fails or doesn't exist
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

      const response = await this.microsoftGraphRequest(hostId, 'POST', 'https://graph.microsoft.com/v1.0/me/events', event);
      if (response) {
        this.logger.log(`[MICROSOFT EVENT] Created for ${hostEmail} and ${guestEmail}`);
        const meetLink = response.onlineMeeting?.joinUrl;
        const externalEventId = response.id;

        if (!meetLink || !externalEventId) {
           throw new BadRequestException('Microsoft Graph API created the event but failed to generate a Teams link or Event ID.');
        }

        return { 
          meetLink: meetLink,
          eventId: externalEventId
        };
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create external Microsoft Calendar event.');
    }

    // 3. Fallback to nulls if NO integrations exist
    return { meetLink: null, eventId: null };
  }

  async updateCalendarEvent(hostId: string, eventId: string, startTime: string, endTime: string) {
    if (!eventId) return;

    // 1. Try Google Integration First
    try {
      const calendar = await this.getGoogleCalendarClient(hostId);
      if (calendar) {
        await calendar.events.patch({
          calendarId: 'primary',
          eventId: eventId,
          requestBody: {
            start: { dateTime: startTime },
            end: { dateTime: endTime },
          },
        });
        this.logger.log(`[GOOGLE CALENDAR EVENT] Updated event ${eventId}`);
        return;
      }
    } catch (error: any) {
      this.logger.error(`Failed to update Google calendar event: ${error.message}`);
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
         await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' }
         }).catch(() => {});
      }
      throw new BadRequestException('Failed to update external calendar event. Token may be expired or revoked.');
    }

    // 2. Try Microsoft Integration
    try {
      const event = {
        start: { dateTime: startTime, timeZone: "UTC" },
        end: { dateTime: endTime, timeZone: "UTC" }
      };
      
      const response = await this.microsoftGraphRequest(hostId, 'PATCH', `https://graph.microsoft.com/v1.0/me/events/${eventId}`, event);
      if (response) {
        this.logger.log(`[MICROSOFT EVENT] Updated event ${eventId}`);
        return;
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to update Microsoft event via Graph API: ${error.message}`);
      throw new BadRequestException('Failed to update external Microsoft Calendar event.');
    }
  }

  async deleteCalendarEvent(hostId: string, eventId: string) {
    if (!eventId) return;

    // 1. Try Google
    try {
      const calendar = await this.getGoogleCalendarClient(hostId);
      if (calendar) {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: eventId,
        });
        this.logger.log(`[GOOGLE CALENDAR EVENT] Deleted event ${eventId}`);
        return;
      }
    } catch (error: any) {
      // 410 Gone or 404 Not Found is fine, means already deleted.
      if (error.code !== 404 && error.code !== 410) {
        this.logger.error(`Failed to delete Google calendar event: ${error.message}`);
      }
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
         await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' }
         }).catch(() => {});
      }
    }

    // 2. Try Microsoft
    try {
      const response = await this.microsoftGraphRequest(hostId, 'DELETE', `https://graph.microsoft.com/v1.0/me/events/${eventId}`);
      if (response !== null) {
         this.logger.log(`[MICROSOFT EVENT] Deleted event ${eventId}`);
      }
    } catch (error: any) {
      // Ignore 404 for deletion
      if (error.response?.status !== 404) {
        this.logger.error(`Failed to delete Microsoft calendar event: ${error.message}`);
      }
    }
  }

  async getBusyPeriods(hostId: string, startTime: string, endTime: string): Promise<{start: Date, end: Date}[]> {
    const busyPeriods: {start: Date, end: Date}[] = [];
    
    // 1. Check Google Integration
    try {
      const googleIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'google' } }
      });

      if (googleIntegration && googleIntegration.checkConflicts) {
        const calendar = await this.getGoogleCalendarClient(hostId);
        if (calendar) {
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
    } catch (error: any) {
      this.logger.error(`Failed to fetch Google busy periods: ${error.message}`);
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
         await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' }
         }).catch(() => {});
      }
    }

    // 2. Check Microsoft Integration
    try {
      const microsoftIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'microsoft' } }
      });

      if (microsoftIntegration && microsoftIntegration.checkConflicts) {
        let nextLink: string | null = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(startTime)}&endDateTime=${encodeURIComponent(endTime)}&$select=start,end,showAs`;
        
        while (nextLink) {
          const response = await this.microsoftGraphRequest(hostId, 'GET', nextLink);
          if (response && response.value) {
            for (const item of response.value) {
              if (item.showAs === 'busy' || item.showAs === 'tentative' || item.showAs === 'oof') {
                if (item.start?.dateTime && item.end?.dateTime) {
                  const tzStart = item.start.timeZone === 'UTC' && !item.start.dateTime.endsWith('Z') ? item.start.dateTime + 'Z' : item.start.dateTime;
                  const tzEnd = item.end.timeZone === 'UTC' && !item.end.dateTime.endsWith('Z') ? item.end.dateTime + 'Z' : item.end.dateTime;
                  busyPeriods.push({ start: new Date(tzStart), end: new Date(tzEnd) });
                }
              }
            }
            nextLink = response['@odata.nextLink'] || null;
          } else {
            nextLink = null;
          }
        }
      }
    } catch (error: any) {
       this.logger.error(`Failed to fetch Microsoft busy periods: ${error.message}`);
    }

    return busyPeriods;
  }

  async getGoogleEvents(hostId: string, timeMin?: string, timeMax?: string) {
    try {
      const calendar = await this.getGoogleCalendarClient(hostId);
      if (!calendar) return [];

      const minDate = timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const maxDate = timeMax || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: minDate,
        timeMax: maxDate,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const items = response.data.items || [];
      return items.map((evt) => ({
        id: `google-${evt.id}`,
        title: evt.summary || 'Google Calendar Event',
        description: evt.description || '',
        startTime: evt.start?.dateTime || evt.start?.date || '',
        endTime: evt.end?.dateTime || evt.end?.date || '',
        guestName: evt.organizer?.displayName || evt.organizer?.email || 'Google Calendar User',
        guestEmail: evt.organizer?.email || '',
        status: 'CONFIRMED',
        meetingUrl: evt.hangoutLink || evt.htmlLink || '',
        isExternal: true,
        provider: 'google',
        eventType: {
          title: 'Google Calendar (Synced)',
        },
      }));
    } catch (error: any) {
      this.logger.error(`Failed to fetch Google Calendar events: ${error.message}`);
      return [];
    }
  }
}
