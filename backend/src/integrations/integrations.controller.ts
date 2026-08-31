import { Controller, Get, Patch, Param, Body, Req, Res, UseGuards, Query, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request, Response } from 'express';
import axios from 'axios';
import * as crypto from 'crypto';
import { getJwtSecret } from '../auth/jwt.config';

@Controller('integrations')
export class IntegrationsController {
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

  private generateOAuthState(userId: string, provider: string, customRedirect?: string): string {
    const payload = JSON.stringify({
      userId,
      provider,
      customRedirect,
      exp: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    const secret = getJwtSecret();
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const base64Payload = Buffer.from(payload).toString('base64');
    return `${base64Payload}.${hmac}`;
  }

  private verifyOAuthState(state: string, expectedProvider: string): { userId: string; customRedirect?: string } | null {
    if (!state || !state.includes('.')) return null;
    const [base64Payload, signature] = state.split('.');
    
    const secret = getJwtSecret();
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8');
    
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
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

  private getFrontendRedirect(customRedirect?: string, queryParam: string = ''): string {
    let baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    if (customRedirect && (customRedirect.startsWith('http://') || customRedirect.startsWith('https://') || customRedirect.startsWith('capacitor://') || customRedirect.startsWith('meet://'))) {
      baseUrl = customRedirect.replace(/\/$/, '');
    }
    const separator = baseUrl.includes('?') ? '&' : '?';
    if (baseUrl.includes('/dashboard/integrations')) {
      return queryParam ? `${baseUrl}${separator}${queryParam}` : baseUrl;
    }
    return queryParam ? `${baseUrl}/dashboard/integrations${separator}${queryParam}` : `${baseUrl}/dashboard/integrations`;
  }

  @UseGuards(JwtAuthGuard)
  @Get('google/auth')
  async getGoogleAuthUrl(@Req() req: any, @Query('redirect_uri') customRedirect?: string) {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ];
    
    // Pass user ID and optional custom redirect securely in the state parameter
    const state = this.generateOAuthState(req.user.userId, 'google', customRedirect);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: state
    });

    return { url };
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code || !state) {
        return res.redirect(this.getFrontendRedirect(undefined, 'error=missing_params'));
      }

      const verified = this.verifyOAuthState(state, 'google');
      if (!verified) {
        return res.redirect(this.getFrontendRedirect(undefined, 'error=invalid_state'));
      }

      const { userId, customRedirect } = verified;
      customRedirectUrl = customRedirect;

      const oauth2Client = this.getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      
      // Upsert the integration
      await this.prisma.integration.upsert({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'google'
          }
        },
        update: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
        },
        create: {
          userId: userId,
          provider: 'google',
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || null,
        }
      });

      return res.redirect(this.getFrontendRedirect(customRedirectUrl, 'success=google_connected'));
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return res.redirect(this.getFrontendRedirect(customRedirectUrl, 'error=auth_failed'));
    }
  }

  // --- MICROSOFT OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('microsoft/auth')
  async getMicrosoftAuthUrl(@Req() req: any, @Query('redirect_uri') customRedirect?: string) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Microsoft OAuth credentials are not configured.');
    }
    const scopes = 'offline_access Calendars.ReadWrite';
    
    // Pass user ID and optional custom redirect securely
    const state = this.generateOAuthState(req.user.userId, 'microsoft', customRedirect);

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${state}`;
    
    return { url };
  }

  @Get('microsoft/callback')
  async microsoftCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code || !state) {
        return res.redirect(this.getFrontendRedirect(undefined, 'error=missing_params'));
      }

      const verified = this.verifyOAuthState(state, 'microsoft');
      if (!verified) {
        return res.redirect(this.getFrontendRedirect(undefined, 'error=invalid_state'));
      }

      const { userId, customRedirect } = verified;
      customRedirectUrl = customRedirect;

      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new InternalServerErrorException('Microsoft OAuth credentials are not configured.');
      }

      const tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
        new URLSearchParams({
          client_id: clientId,
          scope: 'offline_access Calendars.ReadWrite',
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          client_secret: clientSecret
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const accessToken = tokenResponse.data.access_token;
      const refreshToken = tokenResponse.data.refresh_token || null;

      await this.prisma.integration.upsert({
        where: { userId_provider: { userId: userId, provider: 'microsoft' } },
        update: { accessToken, refreshToken },
        create: { userId: userId, provider: 'microsoft', accessToken, refreshToken }
      });

      return res.redirect(this.getFrontendRedirect(customRedirectUrl, 'success=microsoft_connected'));
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      return res.redirect(this.getFrontendRedirect(customRedirectUrl, 'error=auth_failed'));
    }
  }

  // --- SLACK OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('slack/auth')
  async getSlackAuthUrl(@Req() req: any, @Query('redirect_uri') customRedirect?: string) {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Slack OAuth credentials are not configured.');
    }
    const scopes = 'incoming-webhook,chat:write';
    const state = this.generateOAuthState(req.user.userId, 'slack', customRedirect);

    const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    return { url };
  }

  @Get('slack/callback')
  async slackCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    let customRedirectUrl: string | undefined;
    try {
      if (!code || !state) {
        return res.redirect(this.getFrontendRedirect(undefined, 'error=missing_params'));
      }

      const verified = this.verifyOAuthState(state, 'slack');
      if (!verified) {
        return res.redirect(this.getFrontendRedirect(undefined, 'error=invalid_state'));
      }

      const { userId, customRedirect } = verified;
      customRedirectUrl = customRedirect;

      const clientId = process.env.SLACK_CLIENT_ID;
      const clientSecret = process.env.SLACK_CLIENT_SECRET;
      const redirectUri = process.env.SLACK_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new InternalServerErrorException('Slack OAuth credentials are not configured.');
      }

      const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', 
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      if (!tokenResponse.data.ok) {
        throw new Error('Slack API error: ' + tokenResponse.data.error);
      }
      
      // Use incoming webhook URL if available, else standard token
      const accessToken = tokenResponse.data.incoming_webhook?.url || tokenResponse.data.access_token;

      await this.prisma.integration.upsert({
        where: { userId_provider: { userId: userId, provider: 'slack' } },
        update: { accessToken, refreshToken: null },
        create: { userId: userId, provider: 'slack', accessToken, refreshToken: null }
      });

      return res.redirect(this.getFrontendRedirect(customRedirectUrl, 'success=slack_connected'));
    } catch (error) {
      console.error('Slack OAuth callback error:', error);
      return res.redirect(this.getFrontendRedirect(customRedirectUrl, 'error=auth_failed'));
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getIntegrations(@Req() req: any) {
    const integrations = await this.prisma.integration.findMany({
      where: { userId: req.user.userId },
      select: { provider: true, checkConflicts: true, createdAt: true, accessToken: true }
    });
    return integrations.map(i => ({
      provider: i.provider,
      checkConflicts: i.checkConflicts,
      createdAt: i.createdAt,
      isExpired: i.accessToken === 'EXPIRED'
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':provider/conflicts')
  async toggleConflictCheck(@Req() req: any, @Param('provider') provider: string, @Body('checkConflicts') checkConflicts: boolean) {
    return this.prisma.integration.update({
      where: {
        userId_provider: {
          userId: req.user.userId,
          provider: provider
        }
      },
      data: { checkConflicts }
    });
  }
}
