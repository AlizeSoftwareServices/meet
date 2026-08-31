const fs = require('fs');
const path = 'src/bookings/bookings.service.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
  async rescheduleBooking(bookingId: string, hostId: string, newStartTime: Date, newEndTime: Date) {
    const booking = await this.prisma.booking.findUnique({ 
      where: { id: bookingId },
      include: { eventType: { include: { hosts: true } }, assignedHosts: true }
    });
    
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    const isAssigned = booking.hostId === hostId || booking.assignedHosts.some(h => h.userId === hostId);
    if (!isAssigned) {
      throw new BadRequestException('Unauthorized');
    }

    const schedulingType = booking.eventType.schedulingType || 'PERSONAL';
    let targetHostIds = [];
    if (schedulingType === 'PERSONAL') {
      targetHostIds = [booking.hostId];
    } else {
      targetHostIds = booking.eventType.hosts.map(h => h.userId);
    }

    const occurrencesToAttempt = [{ startTime: newStartTime, endTime: newEndTime, occurrenceNumber: 1 }];
    const evaluated = await this.availabilityEngine.evaluateTeamSlots(
      targetHostIds,
      booking.eventTypeId,
      schedulingType,
      occurrencesToAttempt
    );

    if (!evaluated[0].isAvailable) {
      throw new BadRequestException(evaluated[0].reason || 'Time slot is not available');
    }

    let finalHostIds = evaluated[0].availableHostIds || [];
    if (schedulingType === 'ROUND_ROBIN') {
      let leastBusyHost = null;
      let minCount = Infinity;
      for (const hId of finalHostIds) {
        const count = await this.prisma.booking.count({
          where: { hostId: hId, status: 'CONFIRMED' }
        });
        if (count < minCount || (count === minCount && (!leastBusyHost || hId < leastBusyHost))) {
          minCount = count;
          leastBusyHost = hId;
        }
      }
      if (!leastBusyHost) throw new BadRequestException('No host available');
      finalHostIds = [leastBusyHost];
    }

    const selectedPrimaryHostId = finalHostIds[0];

    // Check overlap again directly inside transaction
    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const overlappingBooking = await tx.booking.findFirst({
        where: {
          hostId: { in: finalHostIds },
          status: 'CONFIRMED',
          id: { not: booking.id },
          OR: [
            { startTime: { lt: newEndTime }, endTime: { gt: newStartTime } }
          ]
        }
      });

      if (overlappingBooking) {
        throw new ConflictException('A host is already booked for this slot');
      }

      await tx.bookingHost.deleteMany({ where: { bookingId: booking.id } });

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'RESCHEDULED',
          startTime: newStartTime,
          endTime: newEndTime,
          hostId: selectedPrimaryHostId,
          assignedHosts: {
            create: finalHostIds.map(uId => ({
              userId: uId,
              role: uId === selectedPrimaryHostId ? 'ORGANIZER' : 'HOST'
            }))
          }
        },
        include: { eventType: true, host: true, assignedHosts: { include: { user: true } } }
      });

      return updated;
    });

    const updatedBooking = transactionResult;

    // Send emails and external calendar updates
    const assignedHosts = updatedBooking.assignedHosts.map(ah => ah.user);
    
    // Clear old external event if we changed host? Or just update it.
    // Actually calendar sync handles updating if possible, but if host changed, we might need to recreate.
    // For now, we will notify hosts.
    for (const h of assignedHosts) {
       await this.pushService.sendToUser(
         h.id,
         'Booking Rescheduled',
         \`Booking with \${booking.guestName} was rescheduled to \${newStartTime.toLocaleString()}.\`
       );
    }
    
    const guestUser = await this.prisma.user.findUnique({ where: { email: booking.guestEmail } });
    if (guestUser) {
      await this.pushService.sendToUser(
        guestUser.id,
        'Booking Rescheduled',
        \`Your booking for \${updatedBooking.eventType.title} was rescheduled to \${newStartTime.toLocaleString()}.\`
      );
    }

    return updatedBooking;
  }
`;

const startIndex = content.indexOf('  async rescheduleBooking(bookingId: string, hostId: string, newStartTime: Date, newEndTime: Date) {');
const endIndex = content.indexOf('  async guestCancel(token: string) {');
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement.trim() + '\\n\\n' + content.substring(endIndex);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Successfully patched rescheduleBooking');
} else {
  console.log('Could not find boundaries for rescheduleBooking');
}
