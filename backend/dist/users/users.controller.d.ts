import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<{
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
    updateProfile(req: any, updateProfileDto: any): Promise<{
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
