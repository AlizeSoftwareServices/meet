const fs = require('fs');
const path = 'src/bookings/bookings.service.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
  async cancelBooking(bookingId: string, hostId: string, reason: string) {
    const booking = await this.prisma.booking.findUnique({ 
      where: { id: bookingId },
      include: { assignedHosts: { include: { user: true } }, host: true }
    });
    
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    const isAssigned = booking.hostId === hostId || booking.assignedHosts.some(h => h.userId === hostId);
    if (!isAssigned) {
      throw new BadRequestException('Unauthorized');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason: reason },
      include: { eventType: true },
    });

    // Trigger cancel email via EmailService
    await this.emailService.sendCancellationEmail(
      booking.guestEmail,
      booking.guestName,
      updatedBooking.eventType.title,
      reason
    ).catch(e => console.error('Failed to send cancellation email:', e));

    const hostsToNotify = booking.assignedHosts.length > 0 
      ? booking.assignedHosts.map(h => h.user) 
      : [booking.host];

    for (const h of hostsToNotify) {
      // Slack Notification
      await this.slackService.sendCancellationNotification(
        h.id,
        booking.guestName,
        updatedBooking.eventType.title,
        reason
      ).catch(e => console.error('Failed to send Slack cancellation notification:', e));

      // Update external calendar
      if (booking.externalEventId) {
        await this.calendarService.deleteCalendarEvent(h.id, booking.externalEventId)
          .catch(e => console.error('Failed to delete external calendar event:', e));
      }

      // Push Notification
      await this.pushService.sendToUser(
        h.id,
        'Booking Cancelled',
        \`Booking with \${booking.guestName} for \${updatedBooking.eventType.title} was cancelled.\`
      );
    }

    const guestUser = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
    if (guestUser) {
      await this.pushService.sendToUser(
        guestUser.id,
        'Booking Cancelled',
        \`Your booking for \${updatedBooking.eventType.title} was cancelled.\`
      );
    }

    return updatedBooking;
  }
`;

const startIndex = content.indexOf('  async cancelBooking(bookingId: string, hostId: string, reason: string) {');
const endIndex = content.indexOf('  async cancelSeries(seriesId: string, hostId: string, reason: string) {');
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement.trim() + '\\n\\n' + content.substring(endIndex);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully patched cancelBooking');
} else {
  console.log('Could not find boundaries for cancelBooking');
}
