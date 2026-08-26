import { Controller, Get, Patch, Param, Body, Req, Res, UseGuards, Query } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request, Response } from 'express';
import axios from 'axios';

@Controller('integrations')
export class IntegrationsController {
  constructor(private prisma: PrismaService) {}

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
      process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback'
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('google/auth')
  async getGoogleAuthUrl(@Req() req: any) {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ];
    
    // Pass user ID in the state parameter so we know who to link the account to on callback
    const state = req.user.userId;

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
    try {
      if (!code || !state) {
        return res.redirect('http://localhost:3000/dashboard/integrations?error=missing_params');
      }

      const userId = state;
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

      return res.redirect('http://localhost:3000/dashboard/integrations?success=google_connected');
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return res.redirect('http://localhost:3000/dashboard/integrations?error=auth_failed');
    }
  }

  // --- MICROSOFT OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('microsoft/auth')
  async getMicrosoftAuthUrl(@Req() req: any) {
    const clientId = process.env.MICROSOFT_CLIENT_ID || 'mock_microsoft_client_id';
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/integrations/microsoft/callback';
    const scopes = 'offline_access Calendars.ReadWrite';
    
    // Pass user ID in the state parameter
    const state = req.user.userId;

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${state}`;
    
    return { url };
  }

  @Get('microsoft/callback')
  async microsoftCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      if (!code || !state) {
        return res.redirect('http://localhost:3000/dashboard/integrations?error=missing_params');
      }

      const userId = state;
      const clientId = process.env.MICROSOFT_CLIENT_ID || 'mock_microsoft_client_id';
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || 'mock_microsoft_client_secret';
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/integrations/microsoft/callback';

      // Mock response if using mock credentials
      let accessToken = 'mock_microsoft_access_token';
      let refreshToken = 'mock_microsoft_refresh_token';

      if (clientId !== 'mock_microsoft_client_id') {
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
        accessToken = tokenResponse.data.access_token;
        refreshToken = tokenResponse.data.refresh_token || null;
      }

      await this.prisma.integration.upsert({
        where: { userId_provider: { userId: userId, provider: 'microsoft' } },
        update: { accessToken, refreshToken },
        create: { userId: userId, provider: 'microsoft', accessToken, refreshToken }
      });

      return res.redirect('http://localhost:3000/dashboard/integrations?success=microsoft_connected');
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      return res.redirect('http://localhost:3000/dashboard/integrations?error=auth_failed');
    }
  }

  // --- SLACK OAUTH ---
  @UseGuards(JwtAuthGuard)
  @Get('slack/auth')
  async getSlackAuthUrl(@Req() req: any) {
    const clientId = process.env.SLACK_CLIENT_ID || 'mock_slack_client_id';
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/api/integrations/slack/callback';
    const scopes = 'incoming-webhook,chat:write';
    const state = req.user.userId;

    const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    return { url };
  }

  @Get('slack/callback')
  async slackCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      if (!code || !state) {
        return res.redirect('http://localhost:3000/dashboard/integrations?error=missing_params');
      }

      const userId = state;
      const clientId = process.env.SLACK_CLIENT_ID || 'mock_slack_client_id';
      const clientSecret = process.env.SLACK_CLIENT_SECRET || 'mock_slack_client_secret';
      const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/api/integrations/slack/callback';

      let accessToken = 'mock_slack_access_token';
      
      if (clientId !== 'mock_slack_client_id') {
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
        accessToken = tokenResponse.data.incoming_webhook?.url || tokenResponse.data.access_token;
      }

      await this.prisma.integration.upsert({
        where: { userId_provider: { userId: userId, provider: 'slack' } },
        update: { accessToken, refreshToken: null },
        create: { userId: userId, provider: 'slack', accessToken, refreshToken: null }
      });

      return res.redirect('http://localhost:3000/dashboard/integrations?success=slack_connected');
    } catch (error) {
      console.error('Slack OAuth callback error:', error);
      return res.redirect('http://localhost:3000/dashboard/integrations?error=auth_failed');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getIntegrations(@Req() req: any) {
    return this.prisma.integration.findMany({
      where: { userId: req.user.userId },
      select: { provider: true, checkConflicts: true, createdAt: true }
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':provider/conflicts')
  async toggleConflicts(
    @Req() req: any,
    @Param('provider') provider: string,
    @Body('checkConflicts') checkConflicts: boolean
  ) {
    return this.prisma.integration.update({
      where: {
        userId_provider: {
          userId: req.user.userId,
          provider: provider,
        },
      },
      data: { checkConflicts: !!checkConflicts },
    });
  }
}
