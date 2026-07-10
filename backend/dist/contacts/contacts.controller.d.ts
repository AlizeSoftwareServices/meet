import { ContactsService } from './contacts.service';
export declare class ContactsController {
    private readonly contactsService;
    constructor(contactsService: ContactsService);
    getContacts(req: any, search: string): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }[]>;
    createContact(req: any, data: any): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }>;
    updateContact(req: any, id: string, data: any): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }>;
    deleteContact(req: any, id: string): Promise<{
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        company: string | null;
        hostId: string;
        lastMeetingDate: Date | null;
        totalMeetings: number;
    }>;
}
