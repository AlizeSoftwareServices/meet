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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const axios_1 = __importDefault(require("axios"));
let IntegrationsController = class IntegrationsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getOAuth2Client() {
        return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID || 'mock_client_id', process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret', process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback');
    }
    async getGoogleAuthUrl(req) {
        const oauth2Client = this.getOAuth2Client();
        const scopes = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly'
        ];
        const state = req.user.userId;
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: state
        });
        return { url };
    }
    async googleCallback(code, state, res) {
        try {
            if (!code || !state) {
                return res.redirect('http://localhost:3000/dashboard/integrations?error=missing_params');
            }
            const userId = state;
            const oauth2Client = this.getOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);
            await this.prisma.integration.upsert({
                where: {
                    userId_provider: {
                        userId: userId,
                        provider: 'google'
                    }
                },
                update: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || undefined,
                },
                create: {
                    userId: userId,
                    provider: 'google',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || null,
                }
            });
            return res.redirect('http://localhost:3000/dashboard/integrations?success=google_connected');
        }
        catch (error) {
            console.error('Google OAuth callback error:', error);
            return res.redirect('http://localhost:3000/dashboard/integrations?error=auth_failed');
        }
    }
    async getMicrosoftAuthUrl(req) {
        const clientId = process.env.MICROSOFT_CLIENT_ID || 'mock_microsoft_client_id';
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/integrations/microsoft/callback';
        const scopes = 'offline_access Calendars.ReadWrite';
        const state = req.user.userId;
        const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&state=${state}`;
        return { url };
    }
    async microsoftCallback(code, state, res) {
        try {
            if (!code || !state) {
                return res.redirect('http://localhost:3000/dashboard/integrations?error=missing_params');
            }
            const userId = state;
            const clientId = process.env.MICROSOFT_CLIENT_ID || 'mock_microsoft_client_id';
            const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || 'mock_microsoft_client_secret';
            const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/integrations/microsoft/callback';
            let accessToken = 'mock_microsoft_access_token';
            let refreshToken = 'mock_microsoft_refresh_token';
            if (clientId !== 'mock_microsoft_client_id') {
                const tokenResponse = await axios_1.default.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
                    client_id: clientId,
                    scope: 'offline_access Calendars.ReadWrite',
                    code: code,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                    client_secret: clientSecret
                }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                accessToken = tokenResponse.data.access_token;
                refreshToken = tokenResponse.data.refresh_token || null;
            }
            await this.prisma.integration.upsert({
                where: { userId_provider: { userId: userId, provider: 'microsoft' } },
                update: { accessToken, refreshToken },
                create: { userId: userId, provider: 'microsoft', accessToken, refreshToken }
            });
            return res.redirect('http://localhost:3000/dashboard/integrations?success=microsoft_connected');
        }
        catch (error) {
            console.error('Microsoft OAuth callback error:', error);
            return res.redirect('http://localhost:3000/dashboard/integrations?error=auth_failed');
        }
    }
    async getSlackAuthUrl(req) {
        const clientId = process.env.SLACK_CLIENT_ID || 'mock_slack_client_id';
        const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3001/api/integrations/slack/callback';
        const scopes = 'incoming-webhook,chat:write';
        const state = req.user.userId;
        const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
        return { url };
    }
    async slackCallback(code, state, res) {
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
                const tokenResponse = await axios_1.default.post('https://slack.com/api/oauth.v2.access', new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: redirectUri,
                }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                if (!tokenResponse.data.ok) {
                    throw new Error('Slack API error: ' + tokenResponse.data.error);
                }
                accessToken = tokenResponse.data.incoming_webhook?.url || tokenResponse.data.access_token;
            }
            await this.prisma.integration.upsert({
                where: { userId_provider: { userId: userId, provider: 'slack' } },
                update: { accessToken, refreshToken: null },
                create: { userId: userId, provider: 'slack', accessToken, refreshToken: null }
            });
            return res.redirect('http://localhost:3000/dashboard/integrations?success=slack_connected');
        }
        catch (error) {
            console.error('Slack OAuth callback error:', error);
            return res.redirect('http://localhost:3000/dashboard/integrations?error=auth_failed');
        }
    }
    async getIntegrations(req) {
        return this.prisma.integration.findMany({
            where: { userId: req.user.userId },
            select: { provider: true, createdAt: true }
        });
    }
};
exports.IntegrationsController = IntegrationsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('google/auth'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getGoogleAuthUrl", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('microsoft/auth'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getMicrosoftAuthUrl", null);
__decorate([
    (0, common_1.Get)('microsoft/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "microsoftCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('slack/auth'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getSlackAuthUrl", null);
__decorate([
    (0, common_1.Get)('slack/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "slackCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getIntegrations", null);
exports.IntegrationsController = IntegrationsController = __decorate([
    (0, common_1.Controller)('integrations'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IntegrationsController);
//# sourceMappingURL=integrations.controller.js.map