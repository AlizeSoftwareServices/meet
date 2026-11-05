import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  getContacts(
    @Request() req,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
  ) {
    return this.contactsService.getContacts(req.user.userId, search, tag);
  }

  @Get(':id')
  getContactById(@Request() req, @Param('id') id: string) {
    return this.contactsService.getContactById(id, req.user.userId);
  }

  @Get(':id/bookings')
  getContactBookings(@Request() req, @Param('id') id: string) {
    return this.contactsService.getContactBookings(id, req.user.userId);
  }

  @Post()
  createContact(@Request() req, @Body() data: any) {
    return this.contactsService.createOrUpdateContact(
      req.user.userId,
      data.name,
      data.email,
      data.phone,
      data.company,
      data.jobTitle,
      data.timezone,
      data.notes,
      data.tags,
    );
  }

  @Post('import')
  bulkImportContacts(@Request() req, @Body() body: { contacts: any[] }) {
    return this.contactsService.bulkImportContacts(req.user.userId, body.contacts);
  }

  @Post('bulk-delete')
  bulkDeleteContacts(@Request() req, @Body() body: { ids: string[] }) {
    return this.contactsService.bulkDeleteContacts(req.user.userId, body.ids);
  }

  @Patch(':id')
  updateContact(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.contactsService.updateContact(id, req.user.userId, data);
  }

  @Delete(':id')
  deleteContact(@Request() req, @Param('id') id: string) {
    return this.contactsService.deleteContact(id, req.user.userId);
  }
}
