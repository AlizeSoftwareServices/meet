import { PrismaService } from '../prisma/prisma.service';
import type { Response } from 'express';
export declare class IntegrationsController {
    private prisma;
    constructor(prisma: PrismaService);
    private getOAuth2Client;
    getGoogleAuthUrl(req: any): Promise<{
        url: string;
    }>;
    googleCallback(code: string, state: string, res: Response): Promise<void>;
    getMicrosoftAuthUrl(req: any): Promise<{
        url: string;
    }>;
    microsoftCallback(code: string, state: string, res: Response): Promise<void>;
    getSlackAuthUrl(req: any): Promise<{
        url: string;
    }>;
    slackCallback(code: string, state: string, res: Response): Promise<void>;
    getIntegrations(req: any): Promise<{
        createdAt: Date;
        provider: string;
    }[]>;
}
