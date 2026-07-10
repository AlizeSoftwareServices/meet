import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    createUser(data: Prisma.UserCreateInput): Promise<User>;
    getProfile(userId: string): Promise<{
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string | null;
        avatar: string | null;
        bio: string | null;
        timezone: string;
        language: string;
        phone: string | null;
        company: string | null;
        website: string | null;
        userId: string;
    } | null>;
    updateProfile(userId: string, data: any): Promise<{
        name: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string | null;
        avatar: string | null;
        bio: string | null;
        timezone: string;
        language: string;
        phone: string | null;
        company: string | null;
        website: string | null;
        userId: string;
    }>;
}
