import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SecureTokenService, TokenType } from './secure-token.service';
import { EmailService } from '../integrations/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private secureTokenService: SecureTokenService,
    private emailService: EmailService,
  ) {}

  async sendRegistrationOtp(dto: SendOtpDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(cleanEmail);
    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        alreadyRegistered: true,
        message: 'An account with this email already exists. Please sign in.',
      });
    }

    // Generate 6-digit random code
    const otp = crypto.randomInt(100000, 999999).toString();
    const tokenHash = crypto
      .createHash('sha256')
      .update(`REG_OTP:${cleanEmail}:${otp}`)
      .digest('hex');

    // Remove any existing registration OTPs for this email pattern if possible, or create with 5-min TTL
    await this.prisma.actionToken.create({
      data: {
        tokenHash,
        type: 'REGISTRATION_OTP',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    try {
      await this.emailService.sendRegistrationOtp(cleanEmail, otp);
      this.logger.log(
        `[sendRegistrationOtp] Verification code sent to ${cleanEmail}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[sendRegistrationOtp] Failed to deliver OTP email: ${err.message}`,
      );
      throw new BadRequestException(
        'Failed to deliver verification email. Please check the email address.',
      );
    }

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
    };
  }

  async verifyRegistrationOtp(dto: VerifyOtpDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const tokenHash = crypto
      .createHash('sha256')
      .update(`REG_OTP:${cleanEmail}:${dto.otp.trim()}`)
      .digest('hex');

    const record = await this.prisma.actionToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.type !== 'REGISTRATION_OTP' ||
      new Date() > record.expiresAt
    ) {
      throw new BadRequestException(
        'Invalid or expired verification code. Please request a new one.',
      );
    }

    // Consume OTP so it cannot be re-used
    await this.prisma.actionToken
      .delete({ where: { tokenHash } })
      .catch(() => {});

    // Issue cryptographic proof of verification valid for 15 minutes
    const verificationToken = await this.jwtService.signAsync(
      { email: cleanEmail, purpose: 'REGISTRATION_EMAIL_VERIFIED' },
      { expiresIn: '15m' },
    );

    return {
      success: true,
      message: 'Email verified successfully!',
      verificationToken,
    };
  }

  async register(dto: RegisterDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(cleanEmail);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Verify email proof token
    if (!dto.verificationToken) {
      throw new BadRequestException(
        'Please verify your email address before registering.',
      );
    }

    try {
      const decoded: any = await this.jwtService.verifyAsync(
        dto.verificationToken,
      );
      if (
        decoded.email !== cleanEmail ||
        decoded.purpose !== 'REGISTRATION_EMAIL_VERIFIED'
      ) {
        throw new BadRequestException(
          'Invalid verification token for this email.',
        );
      }
    } catch {
      throw new BadRequestException(
        'Email verification has expired or is invalid. Please verify again.',
      );
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Create user and profile in a transaction
    const user = await this.prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        profile: {
          create: {
            name: dto.name,
            username:
              cleanEmail.split('@')[0] +
              '-' +
              Math.random().toString(36).substring(2, 8),
            timezone: 'UTC', // Default, can be updated later
          },
        },
        isVerified: true, // Auto-verify on signup as verified via OTP
      },
      include: {
        profile: true,
      },
    });

    this.emailService
      .sendWelcomeEmail(user.email, user.profile?.name || 'User')
      .catch((e) => {
        this.logger.error(
          `Failed to send welcome email during registration: ${e.message}`,
        );
      });

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.name,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };

    // Fetch profile for return object
    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
    });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name,
        isVerified: user.isVerified,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      const profile = await this.prisma.profile.findUnique({
        where: { userId: user.id },
      });
      await this.secureTokenService.revokeTokensForUser(
        user.id,
        TokenType.PASSWORD_RESET,
      );
      const resetToken = await this.secureTokenService.generateToken(
        TokenType.PASSWORD_RESET,
        1,
        user.id,
      );
      const resetUrl = `${this.emailService.getFrontendBaseUrl()}/reset-password?token=${resetToken}`;
      this.emailService
        .sendPasswordResetEmail(user.email, profile?.name || 'User', resetUrl)
        .catch((e) => {
          this.logger.error(
            `Failed to send password reset email: ${e.message}`,
          );
        });
    }
    return {
      message:
        'If an account exists for this email, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenRecord = await this.secureTokenService.verifyAndConsumeToken(
      dto.token,
      TokenType.PASSWORD_RESET,
    );
    if (!tokenRecord || !tokenRecord.userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    });

    await this.secureTokenService.revokeTokensForUser(
      tokenRecord.userId,
      TokenType.PASSWORD_RESET,
    );
    return { success: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenRecord = await this.secureTokenService.verifyAndConsumeToken(
      dto.token,
      TokenType.EMAIL_VERIFICATION,
    );
    if (!tokenRecord || !tokenRecord.userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { isVerified: true },
    });

    return { success: true };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user && !user.isVerified) {
      const profile = await this.prisma.profile.findUnique({
        where: { userId: user.id },
      });
      await this.secureTokenService.revokeTokensForUser(
        user.id,
        TokenType.EMAIL_VERIFICATION,
      );
      const verifyToken = await this.secureTokenService.generateToken(
        TokenType.EMAIL_VERIFICATION,
        24,
        user.id,
      );
      const verifyUrl = `${this.emailService.getFrontendBaseUrl()}/verify-email?token=${verifyToken}`;
      this.emailService
        .sendVerificationEmail(user.email, profile?.name || 'User', verifyUrl)
        .catch((e) => {
          this.logger.error(
            `Failed to resend verification email: ${e.message}`,
          );
        });
    }
    return {
      message:
        'If an unverified account exists for this email, a verification link has been sent.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid user');
    }

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }
}
