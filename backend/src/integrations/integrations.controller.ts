import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  Headers,
  UseGuards,
  Query,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request, Response } from 'express';
import axios from 'axios';
import * as crypto from 'crypto';
import { getJwtSecret } from '../auth/jwt.config';
import { encryptToken } from '../common/security/security.util';

export interface AuthenticatedRequest {
  user: {
    userId: string;
    email?: string;
  };
  [key: string]: any;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private prisma: PrismaService,
    private calendarService: CalendarService,
  ) {}

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

  private generateOAuthState(
    userId: string,
    provider: string,
    customRedirect?: string,
  ): string {
    const payload = JSON.stringify({
      userId,
      provider,
      customRedirect,
      exp: Date.now() + 10 * 60 * 1000, // 10 minutes
    });
    const secret = getJwtSecret();
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    const base64Payload = Buffer.from(payload).toString('base64');
    return `${base64Payload}.${hmac}`;
  }

  private verifyOAuthState(
    state: string,
    expectedProvider: string,
  ): { userId: string; customRedirect?: string } | null {
    if (!state || !state.includes('.')) return null;
    const [base64Payload, signature] = state.split('.');

    const secret = getJwtSecret();
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    if (signature !== expectedSignature) return null;

    try {
      const parsed = JSON.parse(payload);
      if (parsed.provider !== expectedProvider) return null;
      if (Date.now() > parsed.exp) return null;
      return { userId: parsed.userId, customRedirect: parsed.customRedirect };
    } catch {
      return null;
    }
  }

  private getFrontendRedirect(
    customRedirect?: string,
    queryParam: string = '',
  ): string {
    let baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    if (
      customRedirect &&
      (customRedirect.startsWith('http://') ||
        customRedirect.startsWith('https://') ||
        customRedirect.startsWith('capacitor://') ||
        customRedirect.startsWith('meet://'))
    ) {
      baseUrl = customRedirect.replace(/\/$/, '');
    }

    // Ensure baseUrl has a protocol so Express doesn't treat it as a relative path
    if (
      !baseUrl.startsWith('http://') &&
      !baseUrl.startsWith('https://') &&
      !baseUrl.startsWith('capacitor://') &&
      !baseUrl.startsWith('meet://')
    ) {
      if (baseUrl.includes('localhost')) {
        baseUrl = 'http://' + baseUrl;
      } else {
        baseUrl = 'https://' + baseUrl;
      }
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    if (baseUrl.includes('/dashboard/integrations')) {
      return queryParam ? `${baseUrl}${separator}${queryParam}` : baseUrl;
    }
    return queryParam
      ? `${baseUrl}/dashboard/integrations${separator}${queryParam}`
      : `${baseUrl}/dashboard/integrations`;
  }

  @UseGuards(JwtAuthGuard)
  @Get('google/auth')
  getGoogleAuthUrl(
    @Req() req: AuthenticatedRequest,
    @Query('redirect_uri') customRedirect?: string,
  ) {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    // Pass user ID and optional custom redirect securely in the state parameter
    const state = this.generateOAuthState(
      req.user.userId,
      'google',
      customRedirect,
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: state,
    });

    return { url };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code || !state) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=missing_params'),
        );
      }

      const verified = this.verifyOAuthState(state, 'google');
      if (!verified) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=invalid_state'),
        );
      }

      const { userId, customRedirect } = verified;
      customRedirectUrl = customRedirect;

      const oauth2Client = this.getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      let connectedEmail: string | null = null;
      try {
        const cal = google.calendar({ version: 'v3', auth: oauth2Client });
        const calList = await cal.calendars.get({ calendarId: 'primary' });
        connectedEmail = calList.data.id || null;
      } catch (err) {
        console.warn('Could not fetch Google primary calendar email:', err);
      }

      // Upsert the integration with AES-256-GCM encrypted tokens at rest
      await this.prisma.integration.upsert({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'google',
          },
        },
        update: {
          accessToken: encryptToken(tokens.access_token!),
          ...(tokens.refresh_token && {
            refreshToken: encryptToken(tokens.refresh_token),
          }),
          ...(connectedEmail && { connectedEmail }),
          lastSyncedAt: new Date(),
        },
        create: {
          userId: userId,
          provider: 'google',
          accessToken: encryptToken(tokens.access_token!),
          refreshToken: tokens.refresh_token
            ? encryptToken(tokens.refresh_token)
            : null,
          connectedEmail: connectedEmail || null,
          lastSyncedAt: new Date(),
        },
      });

      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'success=google_connected'),
      );
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'error=auth_failed'),
      );
    }
  }

  // --- MICROSOFT OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('microsoft/auth')
  getMicrosoftAuthUrl(
    @Req() req: AuthenticatedRequest,
    @Query('redirect_uri') customRedirect?: string,
  ) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException(
        'Microsoft OAuth credentials are not configured.',
      );
    }
    const scopes = 'offline_access Calendars.ReadWrite';

    // Pass user ID and optional custom redirect securely
    const state = this.generateOAuthState(
      req.user.userId,
      'microsoft',
      customRedirect,
    );

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${state}`;

    return { url };
  }

  @Get('microsoft/callback')
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code || !state) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=missing_params'),
        );
      }

      const verified = this.verifyOAuthState(state, 'microsoft');
      if (!verified) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=invalid_state'),
        );
      }

      const { userId, customRedirect } = verified;
      customRedirectUrl = customRedirect;

      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new InternalServerErrorException(
          'Microsoft OAuth credentials are not configured.',
        );
      }

      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: clientId,
          scope: 'offline_access Calendars.ReadWrite',
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          client_secret: clientSecret,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      const accessToken = tokenResponse.data.access_token;
      const refreshToken = tokenResponse.data.refresh_token || null;

      await this.prisma.integration.upsert({
        where: { userId_provider: { userId: userId, provider: 'microsoft' } },
        update: {
          accessToken: encryptToken(accessToken),
          refreshToken: refreshToken ? encryptToken(refreshToken) : null,
        },
        create: {
          userId: userId,
          provider: 'microsoft',
          accessToken: encryptToken(accessToken),
          refreshToken: refreshToken ? encryptToken(refreshToken) : null,
        },
      });

      return res.redirect(
        this.getFrontendRedirect(
          customRedirectUrl,
          'success=microsoft_connected',
        ),
      );
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'error=auth_failed'),
      );
    }
  }

  // --- SLACK OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('slack/auth')
  getSlackAuthUrl(
    @Req() req: AuthenticatedRequest,
    @Query('redirect_uri') customRedirect?: string,
  ) {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException(
        'Slack OAuth credentials are not configured.',
      );
    }
    const scopes = 'incoming-webhook,chat:write';
    const state = this.generateOAuthState(
      req.user.userId,
      'slack',
      customRedirect,
    );

    const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    return { url };
  }

  @Get('slack/callback')
  async slackCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code || !state) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=missing_params'),
        );
      }

      const verified = this.verifyOAuthState(state, 'slack');
      if (!verified) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=invalid_state'),
        );
      }

      const { userId, customRedirect } = verified;
      customRedirectUrl = customRedirect;

      const clientId = process.env.SLACK_CLIENT_ID;
      const clientSecret = process.env.SLACK_CLIENT_SECRET;
      const redirectUri = process.env.SLACK_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new InternalServerErrorException(
          'Slack OAuth credentials are not configured.',
        );
      }

      const tokenResponse = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      if (!tokenResponse.data.ok) {
        throw new Error('Slack API error: ' + tokenResponse.data.error);
      }

      // Use incoming webhook URL if available, else standard token
      const accessToken =
        tokenResponse.data.incoming_webhook?.url ||
        tokenResponse.data.access_token;

      await this.prisma.integration.upsert({
        where: { userId_provider: { userId: userId, provider: 'slack' } },
        update: { accessToken: encryptToken(accessToken), refreshToken: null },
        create: {
          userId: userId,
          provider: 'slack',
          accessToken: encryptToken(accessToken),
          refreshToken: null,
        },
      });

      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'success=slack_connected'),
      );
    } catch (error) {
      console.error('Slack OAuth callback error:', error);
      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'error=auth_failed'),
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('slack/webhook')
  async connectSlackWebhook(
    @Req() req: AuthenticatedRequest,
    @Body('webhookUrl') webhookUrl: string,
  ) {
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim().startsWith('https://hooks.slack.com/')) {
      throw new BadRequestException('Please provide a valid Slack webhook URL (must start with https://hooks.slack.com/).');
    }

    await this.prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: req.user.userId,
          provider: 'slack',
        },
      },
      update: {
        accessToken: encryptToken(webhookUrl.trim()),
        lastSyncedAt: new Date(),
      },
      create: {
        userId: req.user.userId,
        provider: 'slack',
        accessToken: encryptToken(webhookUrl.trim()),
        lastSyncedAt: new Date(),
      },
    });

    return { success: true, message: 'Slack Webhook connected successfully.' };
  }

  // --- ZOOM OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('zoom/auth')
  getZoomAuthUrl(
    @Req() req: AuthenticatedRequest,
    @Query('redirect_uri') customRedirect?: string,
  ) {
    const clientId = process.env.ZOOM_CLIENT_ID || 'RhRNfFTyRDQyIDvoBkj9A';
    const redirectUri =
      process.env.ZOOM_REDIRECT_URI ||
      'https://meet-f4ak.onrender.com/integrations/zoom/callback';

    const state = this.generateOAuthState(
      req.user.userId,
      'zoom',
      customRedirect,
    );

    const url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&state=${state}`;

    return { url };
  }

  @Get('zoom/callback')
  async zoomCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=missing_code'),
        );
      }

      let userId: string | undefined;
      if (state) {
        const verified = this.verifyOAuthState(state, 'zoom');
        if (verified) {
          userId = verified.userId;
          customRedirectUrl = verified.customRedirect;
        }
      }

      const clientId = process.env.ZOOM_CLIENT_ID || 'RhRNfFTyRDQyIDvoBkj9A';
      const clientSecret =
        process.env.ZOOM_CLIENT_SECRET || 'Ggf6SB2CwJdfXx7MSisGWLXTDOflN2hF';
      const redirectUri =
        process.env.ZOOM_REDIRECT_URI ||
        'https://meet-f4ak.onrender.com/integrations/zoom/callback';

      // Exchange code for access & refresh tokens via HTTP Basic Auth
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenParams = new URLSearchParams();
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('code', code);
      tokenParams.append('redirect_uri', redirectUri);

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

      const { access_token, refresh_token } = tokenResponse.data;
      if (!access_token) {
        throw new Error('Zoom token exchange failed: no access_token returned');
      }

      // Fetch user profile from Zoom
      let connectedEmail: string | null = null;
      try {
        const userRes = await axios.get('https://api.zoom.us/v2/users/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        connectedEmail = userRes.data.email || null;
      } catch (err: any) {
        console.warn('Could not fetch Zoom user profile:', err.message);
      }

      // If userId wasn't in state, find matching user by email or active user
      if (!userId && connectedEmail) {
        const existingUser = await this.prisma.user.findFirst({
          where: { email: { equals: connectedEmail, mode: 'insensitive' } },
        });
        if (existingUser) {
          userId = existingUser.id;
        }
      }

      if (!userId) {
        const firstUser = await this.prisma.user.findFirst();
        if (firstUser) {
          userId = firstUser.id;
        } else {
          throw new Error('No user found to associate Zoom integration.');
        }
      }

      // Save Zoom integration with encrypted tokens
      await this.prisma.integration.upsert({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'zoom',
          },
        },
        update: {
          accessToken: encryptToken(access_token),
          ...(refresh_token && { refreshToken: encryptToken(refresh_token) }),
          ...(connectedEmail && { connectedEmail }),
          lastSyncedAt: new Date(),
        },
        create: {
          userId: userId,
          provider: 'zoom',
          accessToken: encryptToken(access_token),
          refreshToken: refresh_token ? encryptToken(refresh_token) : null,
          connectedEmail: connectedEmail || null,
          lastSyncedAt: new Date(),
        },
      });

      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'success=zoom_connected'),
      );
    } catch (error: any) {
      console.error('Zoom OAuth callback error:', error?.response?.data || error.message);
      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'error=zoom_auth_failed'),
      );
    }
  }

  // --- ZOHO OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('zoho/auth')
  getZohoAuthUrl(
    @Req() req: AuthenticatedRequest,
    @Query('redirect_uri') customRedirect?: string,
  ) {
    const clientId =
      process.env.ZOHO_CLIENT_ID || '1000.P87HDSC9MBZF4GOD1D7TB7W1PJO0ST';
    const redirectUri =
      process.env.ZOHO_REDIRECT_URI ||
      'https://meet-f4ak.onrender.com/integrations/zoho/callback';

    const state = this.generateOAuthState(
      req.user.userId,
      'zoho',
      customRedirect,
    );

    const scopes = [
      'ZohoMeeting.meeting.ALL',
      'ZohoCRM.modules.leads.ALL',
      'ZohoCRM.modules.contacts.ALL',
      'ZohoCRM.modules.events.ALL',
      'ZohoCRM.users.READ',
      'AaaServer.profile.READ',
    ].join(',');

    const url = `https://accounts.zoho.com/oauth/v2/auth?scope=${encodeURIComponent(
      scopes,
    )}&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&prompt=consent&state=${state}`;

    return { url };
  }

  @Get('zoho/callback')
  async zohoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('accounts-server') accountsServerParam: string,
    @Query('location') locationParam: string,
    @Res() res: Response,
  ) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code) {
        return res.redirect(
          this.getFrontendRedirect(undefined, 'error=missing_code'),
        );
      }

      let userId: string | undefined;
      if (state) {
        const verified = this.verifyOAuthState(state, 'zoho');
        if (verified) {
          userId = verified.userId;
          customRedirectUrl = verified.customRedirect;
        }
      }

      const clientId =
        process.env.ZOHO_CLIENT_ID || '1000.P87HDSC9MBZF4GOD1D7TB7W1PJO0ST';
      const clientSecret =
        process.env.ZOHO_CLIENT_SECRET ||
        '033e7f892abfb889a5ed42145a11b2358acafc124e';
      const redirectUri =
        process.env.ZOHO_REDIRECT_URI ||
        'https://meet-f4ak.onrender.com/integrations/zoho/callback';

      const accountsServer =
        accountsServerParam ||
        (locationParam === 'in'
          ? 'https://accounts.zoho.in'
          : 'https://accounts.zoho.com');

      const tokenParams = new URLSearchParams();
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('client_id', clientId);
      tokenParams.append('client_secret', clientSecret);
      tokenParams.append('redirect_uri', redirectUri);
      tokenParams.append('code', code);

      const tokenResponse = await axios.post(
        `${accountsServer}/oauth/v2/token`,
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, api_domain } = tokenResponse.data;
      if (!access_token) {
        throw new Error(
          `Zoho token exchange failed: ${tokenResponse.data.error || 'no access_token'}`,
        );
      }

      // Fetch user profile from Zoho
      let connectedEmail: string | null = null;
      try {
        const profileRes = await axios.get(`${accountsServer}/oauth/user/info`, {
          headers: { Authorization: `Zoho-oauthtoken ${access_token}` },
        });
        connectedEmail = profileRes.data.Email || profileRes.data.email || null;
      } catch (err: any) {
        console.warn('Could not fetch Zoho profile:', err.message);
      }

      if (!userId && connectedEmail) {
        const existingUser = await this.prisma.user.findFirst({
          where: { email: { equals: connectedEmail, mode: 'insensitive' } },
        });
        if (existingUser) userId = existingUser.id;
      }

      if (!userId) {
        const firstUser = await this.prisma.user.findFirst();
        if (firstUser) userId = firstUser.id;
        else throw new Error('No user found to associate Zoho integration.');
      }

      // Save Zoho integration with encrypted tokens
      await this.prisma.integration.upsert({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'zoho',
          },
        },
        update: {
          accessToken: encryptToken(access_token),
          ...(refresh_token && { refreshToken: encryptToken(refresh_token) }),
          ...(connectedEmail && { connectedEmail }),
          channelId: api_domain || 'https://www.zohoapis.com',
          resourceId: accountsServer,
          lastSyncedAt: new Date(),
        },
        create: {
          userId: userId,
          provider: 'zoho',
          accessToken: encryptToken(access_token),
          refreshToken: refresh_token ? encryptToken(refresh_token) : null,
          connectedEmail: connectedEmail || null,
          channelId: api_domain || 'https://www.zohoapis.com',
          resourceId: accountsServer,
          lastSyncedAt: new Date(),
        },
      });

      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'success=zoho_connected'),
      );
    } catch (error: any) {
      console.error(
        'Zoho OAuth callback error:',
        error?.response?.data || error.message,
      );
      return res.redirect(
        this.getFrontendRedirect(customRedirectUrl, 'error=zoho_auth_failed'),
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getIntegrations(@Req() req: AuthenticatedRequest) {
    const integrations = await this.prisma.integration.findMany({
      where: { userId: req.user.userId },
      select: {
        provider: true,
        checkConflicts: true,
        autoSync: true,
        connectedEmail: true,
        lastSyncedAt: true,
        createdAt: true,
        accessToken: true,
      },
    });
    return integrations.map((i) => ({
      provider: i.provider,
      checkConflicts: i.checkConflicts,
      autoSync: i.autoSync,
      connectedEmail: i.connectedEmail,
      lastSyncedAt: i.lastSyncedAt,
      createdAt: i.createdAt,
      isExpired: i.accessToken === 'EXPIRED',
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':provider/conflicts')
  async toggleConflictCheck(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: string,
    @Body('checkConflicts') checkConflicts: boolean,
  ) {
    return this.prisma.integration.update({
      where: {
        userId_provider: {
          userId: req.user.userId,
          provider: provider,
        },
      },
      data: { checkConflicts },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':provider/auto-sync')
  async toggleAutoSync(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: string,
    @Body('autoSync') autoSync: boolean,
  ) {
    return this.prisma.integration.update({
      where: {
        userId_provider: {
          userId: req.user.userId,
          provider: provider,
        },
      },
      data: { autoSync },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('google/sync')
  async triggerManualGoogleSync(@Req() req: AuthenticatedRequest) {
    return this.calendarService.syncGoogleCalendar(req.user.userId);
  }

  @Post('google/webhook')
  async googleCalendarWebhook(
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-resource-state') state: string,
    @Res() res: Response,
  ) {
    if (state === 'exists' && channelId) {
      const integration = await this.prisma.integration.findFirst({
        where: { channelId },
      });
      if (integration) {
        this.calendarService
          .syncGoogleCalendar(integration.userId)
          .catch(() => {});
      }
    }
    return res.status(200).send('OK');
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':provider/disconnect')
  async disconnectPatch(@Req() req: AuthenticatedRequest, @Param('provider') provider: string) {
    await this.prisma.integration.deleteMany({
      where: {
        userId: req.user.userId,
        provider: provider,
      },
    });
    return {
      success: true,
      message: `${provider} integration disconnected successfully.`,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':provider')
  async disconnectDelete(@Req() req: AuthenticatedRequest, @Param('provider') provider: string) {
    await this.prisma.integration.deleteMany({
      where: {
        userId: req.user.userId,
        provider: provider,
      },
    });
    return {
      success: true,
      message: `${provider} integration disconnected successfully.`,
    };
  }
}
