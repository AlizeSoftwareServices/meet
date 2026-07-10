import { Controller, Get, UseGuards, Request, Query, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  getContacts(@Request() req, @Query('search') search: string) {
    return this.contactsService.getContacts(req.user.userId, search);
  }

  @Post()
  createContact(@Request() req, @Body() data: any) {
    return this.contactsService.createOrUpdateContact(req.user.userId, data.name, data.email, data.phone, data.company);
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
