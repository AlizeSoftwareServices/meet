import { Injectable, Logger } from '@nestjs/common';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private initialized = false;

  constructor(private prisma: PrismaService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase Admin credentials not fully provided. Push notifications are disabled.');
      return;
    }

    try {
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      this.logger.error(`Failed to initialize Firebase Admin: ${error.message}`);
    }
  }

  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>) {
    if (!this.initialized) {
      this.logger.warn(`Push notifications are disabled. Failed to send to token ${token.substring(0, 10)}...: ${title}`);
      return;
    }

    try {
      await getMessaging().send({
        token,
        notification: { title, body },
        data: data || {},
      });
      this.logger.log(`Push notification sent successfully to token ${token.substring(0, 10)}...`);
    } catch (error: any) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.removeInvalidToken(token);
      }
    }
  }

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    try {
      const pushTokens = await this.prisma.pushToken.findMany({
        where: { userId }
      });

      if (!pushTokens || pushTokens.length === 0) {
        return;
      }

      for (const pt of pushTokens) {
        await this.sendToToken(pt.token, title, body, data).catch(e => {
           this.logger.error(`Error sending push to user ${userId} token: ${e.message}`);
        });
      }
    } catch (error: any) {
      this.logger.error(`Error in sendToUser for ${userId}: ${error.message}`);
    }
  }

  private async removeInvalidToken(token: string) {
    try {
      await this.prisma.pushToken.delete({
        where: { token }
      });
      this.logger.log(`Removed invalid/expired FCM token: ${token.substring(0, 10)}...`);
    } catch (error: any) {
      this.logger.error(`Failed to remove invalid token: ${error.message}`);
    }
  }
}
