import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export enum TokenType {
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  GUEST_CANCEL = 'GUEST_CANCEL',
  GUEST_RESCHEDULE = 'GUEST_RESCHEDULE',
  BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION'
}

@Injectable()
export class SecureTokenService {
  private readonly logger = new Logger(SecureTokenService.name);

  constructor(private prisma: PrismaService) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async generateToken(type: TokenType, expirationHours: number, userId?: string, bookingId?: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    await this.prisma.actionToken.create({
      data: {
        tokenHash,
        type,
        userId,
        bookingId,
        expiresAt,
      }
    });

    return rawToken;
  }

  async verifyAndConsumeToken(rawToken: string, type: TokenType): Promise<any> {
    const tokenHash = this.hashToken(rawToken);

    // Atomic consumption: we use delete to consume it so it's strictly single-use
    try {
      const tokenRecord = await this.prisma.actionToken.findUnique({
        where: { tokenHash }
      });

      if (!tokenRecord) {
        return null;
      }

      if (tokenRecord.type !== type) {
        return null;
      }

      if (tokenRecord.expiresAt < new Date()) {
        await this.prisma.actionToken.delete({ where: { tokenHash } }).catch(() => {});
        return null;
      }

      // Consume
      await this.prisma.actionToken.delete({ where: { tokenHash } });
      
      return tokenRecord;
    } catch (e) {
      this.logger.error(`Error consuming token: ${e.message}`);
      return null;
    }
  }

  async verifyToken(rawToken: string, type: TokenType): Promise<any> {
    const tokenHash = this.hashToken(rawToken);

    try {
      const tokenRecord = await this.prisma.actionToken.findUnique({
        where: { tokenHash }
      });

      if (!tokenRecord) {
        return null;
      }

      if (tokenRecord.type !== type) {
        return null;
      }

      if (tokenRecord.expiresAt < new Date()) {
        return null;
      }

      return tokenRecord;
    } catch (e) {
      this.logger.error(`Error verifying token: ${e.message}`);
      return null;
    }
  }

  async revokeTokensForUser(userId: string, type?: TokenType) {
    await this.prisma.actionToken.deleteMany({
      where: {
        userId,
        ...(type ? { type } : {})
      }
    });
  }

  async revokeTokensForBooking(bookingId: string, type?: TokenType) {
    await this.prisma.actionToken.deleteMany({
      where: {
        bookingId,
        ...(type ? { type } : {})
      }
    });
  }
}
