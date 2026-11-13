import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { encryptToken, decryptToken } from '../common/security/security.util';
import axios from 'axios';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prisma: PrismaService) {}

  private getOAuth2Client() {
    if (
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_REDIRECT_URI
    ) {
      throw new InternalServerErrorException(
        'Google OAuth credentials are not configured.',
      );
    }
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  private async getGoogleCalendarClient(hostId: string) {
    const googleIntegration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId: hostId, provider: 'google' } },
    });

    if (!googleIntegration) return null;

    const oauth2Client = this.getOAuth2Client();

    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        void this.prisma.integration
          .update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: {
              accessToken: encryptToken(tokens.access_token),
              ...(tokens.refresh_token && { refreshToken: encryptToken(tokens.refresh_token) }),
            },
          })
          .catch((err: Error) => this.logger.error(`Failed to save refreshed Google tokens: ${err.message}`));
      }
    });

    const decryptedRefresh = decryptToken(googleIntegration.refreshToken);
    oauth2Client.setCredentials({
      access_token: decryptToken(googleIntegration.accessToken),
      refresh_token: decryptedRefresh || undefined,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  // Helper for Microsoft to auto-refresh tokens
  private async microsoftGraphRequest(
    hostId: string,
    method: string,
    url: string,
    data?: any,
  ): Promise<any> {
    const integration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId: hostId, provider: 'microsoft' } },
    });

    if (!integration) return null;

    const decryptedAccessToken = decryptToken(integration.accessToken);
    const decryptedRefreshToken = decryptToken(integration.refreshToken);

    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${decryptedAccessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data !== '' ? response.data : true;
    } catch (error: any) {
      if (error.response?.status === 401 && decryptedRefreshToken) {
        // Try refresh
        try {
          const clientId = process.env.MICROSOFT_CLIENT_ID;
          const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

          if (!clientId || !clientSecret)
            throw new Error('Missing Microsoft credentials');

          const tokenResponse = await axios.post(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            new URLSearchParams({
              client_id: clientId,
              scope: 'offline_access Calendars.ReadWrite',
              refresh_token: decryptedRefreshToken,
              grant_type: 'refresh_token',
              client_secret: clientSecret,
            }).toString(),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
          );

          const newAccessToken = tokenResponse.data.access_token;
          const newRefreshToken =
            tokenResponse.data.refresh_token || decryptedRefreshToken;

          await this.prisma.integration.update({
            where: {
              userId_provider: { userId: hostId, provider: 'microsoft' },
            },
            data: {
              accessToken: encryptToken(newAccessToken),
              refreshToken: newRefreshToken
                ? encryptToken(newRefreshToken)
                : null,
            },
          });

          // Retry request with new token
          const retryResponse = await axios({
            method,
            url,
            data,
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json',
            },
          });
          return retryResponse.data !== '' ? retryResponse.data : true;
        } catch (refreshErr: any) {
          this.logger.error(
            `Failed to refresh Microsoft token: ${refreshErr.message}`,
          );
          await this.prisma.integration
            .update({
              where: {
                userId_provider: { userId: hostId, provider: 'microsoft' },
              },
              data: { accessToken: 'EXPIRED' },
            })
            .catch(() => {});
          throw new BadRequestException(
            'Microsoft calendar token expired and refresh failed. Please reconnect.',
          );
        }
      }
      this.logger.error(
        `Microsoft Graph API error [${method} ${url}]: ${error.message}`,
      );
      throw error;
    }
  }

  // Helper for Zoom to auto-refresh tokens and make requests
  public async zoomApiRequest(
    hostId: string,
    method: string,
    url: string,
    data?: any,
  ): Promise<any> {
    const integration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId: hostId, provider: 'zoom' } },
    });

    if (!integration) return null;

    const decryptedAccessToken = decryptToken(integration.accessToken);
    const decryptedRefreshToken = integration.refreshToken
      ? decryptToken(integration.refreshToken)
      : null;

    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${decryptedAccessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data !== '' ? response.data : true;
    } catch (error: any) {
      if (error.response?.status === 401 && decryptedRefreshToken) {
        try {
          const clientId = process.env.ZOOM_CLIENT_ID || 'RhRNfFTyRDQyIDvoBkj9A';
          const clientSecret =
            process.env.ZOOM_CLIENT_SECRET || 'Ggf6SB2CwJdfXx7MSisGWLXTDOflN2hF';

          const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
            'base64',
          );

          const tokenParams = new URLSearchParams();
          tokenParams.append('grant_type', 'refresh_token');
          tokenParams.append('refresh_token', decryptedRefreshToken);

          const tokenResponse = await axios.post(
            'https://zoom.us/oauth/token',
            tokenParams.toString(),
            {
              headers: {
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          );

          const newAccessToken = tokenResponse.data.access_token;
          const newRefreshToken =
            tokenResponse.data.refresh_token || decryptedRefreshToken;

          await this.prisma.integration.update({
            where: { userId_provider: { userId: hostId, provider: 'zoom' } },
            data: {
              accessToken: encryptToken(newAccessToken),
              refreshToken: newRefreshToken
                ? encryptToken(newRefreshToken)
                : null,
              lastSyncedAt: new Date(),
            },
          });

          const retryResponse = await axios({
            method,
            url,
            data,
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json',
            },
          });
          return retryResponse.data !== '' ? retryResponse.data : true;
        } catch (refreshErr: any) {
          this.logger.error(
            `Failed to refresh Zoom token for host ${hostId}: ${refreshErr.message}`,
          );
          await this.prisma.integration
            .update({
              where: { userId_provider: { userId: hostId, provider: 'zoom' } },
              data: { accessToken: 'EXPIRED' },
            })
            .catch(() => {});
          return null;
        }
      }
      this.logger.error(`Zoom API error [${method} ${url}]: ${error.message}`);
      throw error;
    }
  }

  async createCalendarEvent(
    hostId: string,
    hostEmail: string,
    guestEmail: string,
    startTime: string,
    endTime: string,
    title: string,
    options?: {
      locationType?: string;
      locationDetails?: string;
      hostTimezone?: string;
      existingEventId?: string;
    },
  ): Promise<{ meetLink: string | null; eventId: string | null }> {
    // 1. Try Google Integration First
    try {
      const googleIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'google' } },
      });

      // If user disabled auto-sync, skip creating the event in Google Calendar
      if (googleIntegration && googleIntegration.autoSync === false) {
        this.logger.log(
          `[GOOGLE CALENDAR] Auto-sync is OFF for host ${hostId}. Skipping external event creation.`,
        );
        return { meetLink: null, eventId: null };
      }

      const calendar = await this.getGoogleCalendarClient(hostId);
      if (calendar) {
        // CASE A: Group Event with Existing Google Calendar Event
        // If an event already exists for this slot, append the new guest to attendees and reuse the Google Meet link!
        if (options?.existingEventId) {
          try {
            const existing = await calendar.events.get({
              calendarId: 'primary',
              eventId: options.existingEventId,
            });

            const currentAttendees = existing.data.attendees || [];
            const isAlreadyAttendee = currentAttendees.some(
              (a) => a.email?.toLowerCase() === guestEmail.toLowerCase(),
            );

            if (!isAlreadyAttendee) {
              currentAttendees.push({ email: guestEmail });
              await calendar.events.patch({
                calendarId: 'primary',
                eventId: options.existingEventId,
                requestBody: { attendees: currentAttendees },
              });
              this.logger.log(
                `[GOOGLE CALENDAR] Added guest ${guestEmail} to existing group event ${options.existingEventId}`,
              );
            }

            return {
              meetLink: existing.data.hangoutLink || null,
              eventId: options.existingEventId,
            };
          } catch (patchErr: any) {
            this.logger.warn(
              `Failed to patch existing group event ${options.existingEventId}: ${patchErr.message}. Creating fresh event.`,
            );
          }
        }

        // CASE B: New Event
        const isZoom =
          options?.locationType === 'Zoom' ||
          options?.locationType === 'Zoom Video' ||
          Boolean(options?.locationType?.startsWith('Zoom'));
        const isGoogleMeet =
          (!options?.locationType || options.locationType === 'Google Meet') && !isZoom;
        const tz = options?.hostTimezone || 'UTC';

        // Check if Zoom Meeting should be created
        let zoomMeetLink: string | null = null;
        let zoomPassword: string | null = null;

        if (isZoom) {
          try {
            const zoomIntegration = await this.prisma.integration.findUnique({
              where: { userId_provider: { userId: hostId, provider: 'zoom' } },
            });
            if (zoomIntegration && zoomIntegration.autoSync !== false) {
              const durationMinutes = Math.max(
                15,
                Math.round(
                  (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
                ),
              );
              const zoomRes = await this.zoomApiRequest(
                hostId,
                'POST',
                'https://api.zoom.us/v2/users/me/meetings',
                {
                  topic: title,
                  type: 2,
                  start_time: new Date(startTime).toISOString(),
                  duration: durationMinutes,
                  timezone: tz,
                  settings: {
                    join_before_host: true,
                    participant_video: true,
                    host_video: true,
                  },
                },
              );
              if (zoomRes?.join_url) {
                zoomMeetLink = zoomRes.join_url;
                zoomPassword = zoomRes.password || null;
                this.logger.log(`[ZOOM MEETING CREATED] ${zoomMeetLink} for ${hostEmail}`);
              }
            }
          } catch (zoomErr: any) {
            this.logger.warn(`Failed to create Zoom meeting for ${hostEmail}: ${zoomErr.message}`);
          }
        }

        const event: any = {
          summary: title,
          start: { dateTime: startTime, timeZone: tz },
          end: { dateTime: endTime, timeZone: tz },
          attendees: [{ email: guestEmail }, { email: hostEmail }],
        };

        if (zoomMeetLink) {
          event.location = zoomMeetLink;
          event.description = `Zoom Meeting: ${zoomMeetLink}${zoomPassword ? `\nPasscode: ${zoomPassword}` : ''}\n\nConducted via Zoom Video.`;
        } else if (isGoogleMeet) {
          event.conferenceData = {
            createRequest: {
              requestId: `MeetSync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          };
        } else if (options?.locationType === 'In Person') {
          event.location = options.locationDetails || 'In Person';
          event.description = `In-person meeting at: ${options.locationDetails || 'Location to be specified'}`;
        } else if (options?.locationType === 'Phone Call') {
          event.location = options.locationDetails || 'Phone Call';
          event.description = `Phone call: ${options.locationDetails || 'Phone numbers exchanged upon booking'}`;
        }

        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          conferenceDataVersion: isGoogleMeet ? 1 : 0,
        });

        this.logger.log(
          `[GOOGLE CALENDAR EVENT] Created for ${hostEmail} and ${guestEmail} (${options?.locationType || 'Google Meet'})`,
        );

        const meetLink = zoomMeetLink || (isGoogleMeet ? response.data.hangoutLink || null : null);
        const externalEventId = response.data.id || null;

        return {
          meetLink,
          eventId: externalEventId,
        };
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to create Google Calendar event: ${error.message}`,
      );
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        await this.prisma.integration
          .update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' },
          })
          .catch(() => {});
      }
      throw new BadRequestException(
        'Failed to create external Google Calendar event. Token may be expired or revoked. Please reconnect.',
      );
    }

    // 2. Try Microsoft Integration if Google fails or doesn't exist
    try {
      const event = {
        subject: title,
        body: { contentType: 'HTML', content: 'Event created by MeetSync' },
        start: { dateTime: startTime, timeZone: 'UTC' },
        end: { dateTime: endTime, timeZone: 'UTC' },
        attendees: [
          {
            emailAddress: { address: guestEmail, name: guestEmail },
            type: 'required',
          },
        ],
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
      };

      const response = await this.microsoftGraphRequest(
        hostId,
        'POST',
        'https://graph.microsoft.com/v1.0/me/events',
        event,
      );
      if (response) {
        this.logger.log(
          `[MICROSOFT EVENT] Created for ${hostEmail} and ${guestEmail}`,
        );
        const meetLink = response.onlineMeeting?.joinUrl;
        const externalEventId = response.id;

        if (!meetLink || !externalEventId) {
          throw new BadRequestException(
            'Microsoft Graph API created the event but failed to generate a Teams link or Event ID.',
          );
        }

        return {
          meetLink: meetLink,
          eventId: externalEventId,
        };
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'Failed to create external Microsoft Calendar event.',
      );
    }

    // 3. Try Standalone Zoom if user chose Zoom and no external calendar is synced
    if (
      options?.locationType === 'Zoom' ||
      options?.locationType === 'Zoom Video' ||
      Boolean(options?.locationType?.startsWith('Zoom'))
    ) {
      try {
        const zoomIntegration = await this.prisma.integration.findUnique({
          where: { userId_provider: { userId: hostId, provider: 'zoom' } },
        });
        if (zoomIntegration && zoomIntegration.autoSync !== false) {
          const durationMinutes = Math.max(
            15,
            Math.round(
              (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
            ),
          );
          const zoomRes = await this.zoomApiRequest(
            hostId,
            'POST',
            'https://api.zoom.us/v2/users/me/meetings',
            {
              topic: title,
              type: 2,
              start_time: new Date(startTime).toISOString(),
              duration: durationMinutes,
              timezone: options?.hostTimezone || 'UTC',
              settings: {
                join_before_host: true,
                participant_video: true,
                host_video: true,
              },
            },
          );
          if (zoomRes?.join_url) {
            return {
              meetLink: zoomRes.join_url,
              eventId: null,
            };
          }
        }
      } catch (zoomErr: any) {
        this.logger.warn(`Standalone Zoom creation failed: ${zoomErr.message}`);
      }
    }

    // 4. Fallback to nulls if NO integrations exist
    return { meetLink: null, eventId: null };
  }

  async updateCalendarEvent(
    hostId: string,
    eventId: string,
    startTime: string,
    endTime: string,
  ) {
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
      this.logger.error(
        `Failed to update Google calendar event: ${error.message}`,
      );
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        await this.prisma.integration
          .update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' },
          })
          .catch(() => {});
      }
      throw new BadRequestException(
        'Failed to update external calendar event. Token may be expired or revoked.',
      );
    }

    // 2. Try Microsoft Integration
    try {
      const event = {
        start: { dateTime: startTime, timeZone: 'UTC' },
        end: { dateTime: endTime, timeZone: 'UTC' },
      };

      const response = await this.microsoftGraphRequest(
        hostId,
        'PATCH',
        `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
        event,
      );
      if (response) {
        this.logger.log(`[MICROSOFT EVENT] Updated event ${eventId}`);
        return;
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `Failed to update Microsoft event via Graph API: ${error.message}`,
      );
      throw new BadRequestException(
        'Failed to update external Microsoft Calendar event.',
      );
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
        this.logger.error(
          `Failed to delete Google calendar event: ${error.message}`,
        );
      }
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        await this.prisma.integration
          .update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' },
          })
          .catch(() => {});
      }
    }

    // 2. Try Microsoft
    try {
      const response = await this.microsoftGraphRequest(
        hostId,
        'DELETE',
        `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      );
      if (response !== null) {
        this.logger.log(`[MICROSOFT EVENT] Deleted event ${eventId}`);
      }
    } catch (error: any) {
      // Ignore 404 for deletion
      if (error.response?.status !== 404) {
        this.logger.error(
          `Failed to delete Microsoft calendar event: ${error.message}`,
        );
      }
    }
  }

  async getBusyPeriods(
    hostId: string,
    startTime: string,
    endTime: string,
  ): Promise<{ start: Date; end: Date }[]> {
    const busyPeriods: { start: Date; end: Date }[] = [];

    // 1. Check Google Integration
    try {
      const googleIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'google' } },
      });

      if (googleIntegration && googleIntegration.checkConflicts) {
        const calendar = await this.getGoogleCalendarClient(hostId);
        if (calendar) {
          const response = await calendar.freebusy.query({
            requestBody: {
              timeMin: startTime,
              timeMax: endTime,
              items: [{ id: 'primary' }],
            },
          });

          const calendars = response.data.calendars;
          if (calendars && calendars.primary && calendars.primary.busy) {
            for (const busy of calendars.primary.busy) {
              if (busy.start && busy.end) {
                busyPeriods.push({
                  start: new Date(busy.start),
                  end: new Date(busy.end),
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch Google busy periods: ${error.message}`,
      );
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        await this.prisma.integration
          .update({
            where: { userId_provider: { userId: hostId, provider: 'google' } },
            data: { accessToken: 'EXPIRED' },
          })
          .catch(() => {});
      }
    }

    // 2. Check Microsoft Integration
    try {
      const microsoftIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'microsoft' } },
      });

      if (microsoftIntegration && microsoftIntegration.checkConflicts) {
        let nextLink: string | null =
          `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(startTime)}&endDateTime=${encodeURIComponent(endTime)}&$select=start,end,showAs`;

        while (nextLink) {
          const response = await this.microsoftGraphRequest(
            hostId,
            'GET',
            nextLink,
          );
          if (response && response.value) {
            for (const item of response.value) {
              if (
                item.showAs === 'busy' ||
                item.showAs === 'tentative' ||
                item.showAs === 'oof'
              ) {
                if (item.start?.dateTime && item.end?.dateTime) {
                  const tzStart =
                    item.start.timeZone === 'UTC' &&
                    !item.start.dateTime.endsWith('Z')
                      ? item.start.dateTime + 'Z'
                      : item.start.dateTime;
                  const tzEnd =
                    item.end.timeZone === 'UTC' &&
                    !item.end.dateTime.endsWith('Z')
                      ? item.end.dateTime + 'Z'
                      : item.end.dateTime;
                  busyPeriods.push({
                    start: new Date(tzStart),
                    end: new Date(tzEnd),
                  });
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
      this.logger.error(
        `Failed to fetch Microsoft busy periods: ${error.message}`,
      );
    }

    return busyPeriods;
  }

  /**
   * Two-Way Reconciliation Sync:
   * Syncs Google Calendar changes (deletions, reschedules) back to Alize Meet.
   */
  async syncGoogleCalendar(hostId: string) {
    try {
      const googleIntegration = await this.prisma.integration.findUnique({
        where: { userId_provider: { userId: hostId, provider: 'google' } },
      });

      if (!googleIntegration) {
        throw new BadRequestException('Google Calendar integration not found.');
      }

      const calendar = await this.getGoogleCalendarClient(hostId);
      if (!calendar) {
        throw new BadRequestException(
          'Could not authenticate with Google Calendar.',
        );
      }

      const pastWindow = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      const futureWindow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days in future

      // Fetch Google Calendar events (including cancelled/deleted ones)
      const gResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: pastWindow.toISOString(),
        timeMax: futureWindow.toISOString(),
        singleEvents: true,
        showDeleted: true,
      });

      const googleItems = gResponse.data.items || [];
      const googleItemsMap = new Map<string, any>();
      for (const item of googleItems) {
        if (item.id) googleItemsMap.set(item.id, item);
      }

      // Fetch active Alize Meet bookings in the same window that have externalEventId
      const localBookings = await this.prisma.booking.findMany({
        where: {
          hostId,
          externalEventId: { not: null },
          startTime: { gte: pastWindow, lte: futureWindow },
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
        },
        include: { eventType: true },
      });

      let cancelledCount = 0;
      let rescheduledCount = 0;

      for (const booking of localBookings) {
        if (!booking.externalEventId) continue;
        const gEvent = googleItemsMap.get(booking.externalEventId);

        // 1. Deletion check in Google Calendar
        if (!gEvent || gEvent.status === 'cancelled') {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: 'CANCELLED',
              cancelReason: 'Cancelled directly in Google Calendar',
            },
          });
          cancelledCount++;
          this.logger.log(
            `[SYNC RECONCILIATION] Marked booking ${booking.id} as CANCELLED (deleted in Google Calendar)`,
          );
        }
        // 2. Reschedule check in Google Calendar
        else if (gEvent.start?.dateTime && gEvent.end?.dateTime) {
          const gStart = new Date(gEvent.start.dateTime);
          const gEnd = new Date(gEvent.end.dateTime);

          // If start time shifted by more than 1 minute
          if (
            Math.abs(gStart.getTime() - booking.startTime.getTime()) > 60000
          ) {
            await this.prisma.booking.update({
              where: { id: booking.id },
              data: {
                startTime: gStart,
                endTime: gEnd,
                status: 'RESCHEDULED',
              },
            });
            rescheduledCount++;
            this.logger.log(
              `[SYNC RECONCILIATION] Updated booking ${booking.id} time to ${gStart.toISOString()}`,
            );
          }
        }
      }

      const now = new Date();
      await this.prisma.integration.update({
        where: { userId_provider: { userId: hostId, provider: 'google' } },
        data: { lastSyncedAt: now },
      });

      return {
        success: true,
        message: 'Google Calendar synchronized successfully.',
        totalGoogleEvents: googleItems.length,
        reconciledBookings: localBookings.length,
        cancelledCount,
        rescheduledCount,
        lastSyncedAt: now,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to synchronize Google Calendar for host ${hostId}: ${err.message}`,
      );
      throw new BadRequestException(
        `Google Calendar synchronization failed: ${err.message}`,
      );
    }
  }

  async getGoogleEvents(
    hostId: string,
    timeMin?: string,
    timeMax?: string,
    excludeEventIds: string[] = [],
  ) {
    try {
      const calendar = await this.getGoogleCalendarClient(hostId);
      if (!calendar) return [];

      const minDate =
        timeMin ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const maxDate =
        timeMax ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: minDate,
        timeMax: maxDate,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const items = response.data.items || [];
      const excludeSet = new Set(excludeEventIds);

      return items
        .filter((evt) => evt.id && !excludeSet.has(evt.id))
        .map((evt) => ({
          id: `google-${evt.id}`,
          title: evt.summary || 'Google Calendar Event',
          description: evt.description || '',
          startTime: evt.start?.dateTime || evt.start?.date || '',
          endTime: evt.end?.dateTime || evt.end?.date || '',
          guestName:
            evt.organizer?.displayName ||
            evt.organizer?.email ||
            'Google Calendar User',
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
      this.logger.error(
        `Failed to fetch Google Calendar events: ${error.message}`,
      );
      return [];
    }
  }
}
