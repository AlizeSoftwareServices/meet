import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Create user and profile in a transaction
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        profile: {
          create: {
            name: dto.name,
            username: dto.email.split('@')[0] + '-' + Math.random().toString(36).substring(2, 8),
            timezone: 'UTC', // Default, can be updated later
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const verifyToken = await this.secureTokenService.generateToken(TokenType.EMAIL_VERIFICATION, 24, user.id);
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
    this.emailService.sendVerificationEmail(user.email, user.profile?.name || 'User', verifyUrl).catch(e => {
       this.logger.error(`Failed to send verification email during registration: ${e.message}`);
    });

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.name,
      }
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
    const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name,
        isVerified: user.isVerified
      }
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
      await this.secureTokenService.revokeTokensForUser(user.id, TokenType.PASSWORD_RESET);
      const resetToken = await this.secureTokenService.generateToken(TokenType.PASSWORD_RESET, 1, user.id);
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      this.emailService.sendPasswordResetEmail(user.email, profile?.name || 'User', resetUrl).catch(e => {
        this.logger.error(`Failed to send password reset email: ${e.message}`);
      });
    }
    return { message: 'If an account exists for this email, a password reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenRecord = await this.secureTokenService.verifyAndConsumeToken(dto.token, TokenType.PASSWORD_RESET);
    if (!tokenRecord || !tokenRecord.userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash }
    });

    await this.secureTokenService.revokeTokensForUser(tokenRecord.userId, TokenType.PASSWORD_RESET);
    return { success: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenRecord = await this.secureTokenService.verifyAndConsumeToken(dto.token, TokenType.EMAIL_VERIFICATION);
    if (!tokenRecord || !tokenRecord.userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { isVerified: true }
    });

    return { success: true };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user && !user.isVerified) {
      const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
      await this.secureTokenService.revokeTokensForUser(user.id, TokenType.EMAIL_VERIFICATION);
      const verifyToken = await this.secureTokenService.generateToken(TokenType.EMAIL_VERIFICATION, 24, user.id);
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
      this.emailService.sendVerificationEmail(user.email, profile?.name || 'User', verifyUrl).catch(e => {
         this.logger.error(`Failed to resend verification email: ${e.message}`);
      });
    }
    return { message: 'If an unverified account exists for this email, a verification link has been sent.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid user');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    return { success: true };
  }
}
