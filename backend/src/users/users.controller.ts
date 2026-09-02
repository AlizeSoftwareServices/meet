import { Controller, Get, Put, Delete, Body, UseGuards, Request, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Put()
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Delete('account')
  deleteAccount(@Request() req) {
    return this.usersService.deleteAccount(req.user.userId);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/i)) {
        return cb(new BadRequestException('Only JPG, JPEG, PNG, WEBP, and GIF image files are allowed!'), false);
      }
      cb(null, true);
    }
  }))
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    // Create the public URL
    // Make sure static files are served in main.ts
    const avatarUrl = `/public/uploads/${file.filename}`;
    
    // Save to user profile
    await this.usersService.updateProfile(req.user.userId, { avatar: avatarUrl });
    
    return { avatarUrl };
  }
}
