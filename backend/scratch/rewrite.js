const fs = require('fs');

const path = 'src/bookings/bookings.service.ts';
let content = fs.readFileSync(path, 'utf8');

// I will just read the whole content, find `async createBooking(dto: CreateBookingDto) {` and replace up to its end.
const startIndex = content.indexOf('  async createBooking(dto: CreateBookingDto) {');
const endIndex = content.indexOf('  async getHostBookings(hostId: string) {', startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find createBooking bounds');
  process.exit(1);
}

const newCreateBooking = `  async createBooking(dto: CreateBookingDto) {
    // 1. Fetch Event Type
    const eventType = await this.prisma.eventType.findUnique({
      where: { id: dto.eventTypeId },
      include: { customQuestions: true, hosts: true }
    });

    if (!eventType) {
      throw new BadRequestException('Event type not found');
    }

    if (dto.singleUseToken) {
      const link = await this.prisma.singleUseLink.findUnique({
        where: { tokenHash: dto.singleUseToken }
      });
      if (!link) {
        throw new BadRequestException('Invalid single-use link token');
      }
      if (link.used) {
        throw new BadRequestException('This single-use link has already been used');
      }
      if (link.expiresAt && link.expiresAt < new Date()) {
        throw new BadRequestException('This single-use link has expired');
      }
      if (link.eventTypeId !== dto.eventTypeId) {
        throw new BadRequestException('Token is not valid for this event type');
      }
    }

    // Determine target host(s)
    const schedulingType = eventType.schedulingType || 'PERSONAL';
    let targetHostIds: string[] = [];
    if (schedulingType === 'PERSONAL') {
      const hId = dto.hostId || eventType.userId;
      if (!hId) throw new BadRequestException('Host ID is required for personal events');
      targetHostIds = [hId];
    } else {
      if (!eventType.hosts || eventType.hosts.length === 0) {
        throw new BadRequestException('Team event has no assigned hosts');
      }
      targetHostIds = eventType.hosts.map(h => h.userId);
    }

    // Load hosts to get timezones and versions
    const hosts = await this.prisma.user.findMany({
      where: { id: { in: targetHostIds } },
      include: { profile: true }
    });
    if (hosts.length !== targetHostIds.length) {
      throw new BadRequestException('One or more hosts not found');
    }

    // Use primary host's timezone (for Personal/RR fallback) or assume collective handles all
    // Fallback timezone to primary host
    const primaryHost = hosts.find(h => h.id === (dto.hostId || eventType.userId)) || hosts[0];
    const timezone = primaryHost.profile?.timezone || 'UTC';

    let dbAnswers: { customQuestionId: string; questionLabel: string; value: string }[] = [];
    if (eventType.customQuestions && eventType.customQuestions.length > 0) {
      const answersMap = new Map<string, string>();
      const submittedIds = new Set<string>();

      if (dto.answers) {
        for (const ans of dto.answers) {
          if (submittedIds.has(ans.questionId)) {
             throw new BadRequestException(\`Duplicate answer submitted for question \${ans.questionId}\`);
          }
          submittedIds.add(ans.questionId);
          answersMap.set(ans.questionId, ans.value);
        }
      }

      const validQuestionIds = new Set(eventType.customQuestions.map(q => q.id));
      for (const id of submittedIds) {
        if (!validQuestionIds.has(id)) {
           throw new BadRequestException(\`Unknown questionId submitted: \${id}\`);
        }
      }

      for (const q of eventType.customQuestions) {
        const val = answersMap.get(q.id);
        const hasValue = val !== undefined && val !== null && val.trim() !== '';

        if (q.required && !hasValue) {
           throw new BadRequestException(\`Question "\${q.label}" is required.\`);
        }

        if (hasValue) {
           if ((q.type === 'DROPDOWN' || q.type === 'MULTIPLE_CHOICE') && !q.options.includes(val)) {
              try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) {
                  for (const p of parsed) {
                    if (!q.options.includes(p)) {
                      throw new BadRequestException(\`Invalid option "\${p}" for question "\${q.label}"\`);
                    }
                  }
                } else {
                  throw new BadRequestException(\`Invalid option "\${val}" for question "\${q.label}"\`);
                }
              } catch (e) {
                if (e instanceof BadRequestException) throw e;
                throw new BadRequestException(\`Invalid option "\${val}" for question "\${q.label}"\`);
              }
           } else if (q.type === 'NUMBER') {
              if (isNaN(Number(val))) {
                 throw new BadRequestException(\`Question "\${q.label}" must be a valid number.\`);
              }
           } else if (q.type === 'PHONE') {
              if (!/^\\+?[0-9\\s\\-\\(\\)]+$/.test(val)) {
                 throw new BadRequestException(\`Question "\${q.label}" must be a valid phone number.\`);
              }
           }
           
           dbAnswers.push({
             customQuestionId: q.id,
             questionLabel: q.label,
             value: val,
           });
        }
      }
    } else if (dto.answers && dto.answers.length > 0) {
       throw new BadRequestException(\`This event type does not accept custom answers.\`);
    }

    let occurrencesToAttempt = [{ startTime: new Date(dto.startTime), endTime: new Date(dto.endTime), occurrenceNumber: 1 }];

    if (dto.recurrence && eventType.allowRecurring) {
       occurrencesToAttempt = this.calculateOccurrences(
          dto.startTime, 
          dto.endTime, 
          timezone, 
          dto.recurrence, 
          eventType.recurringMaxOccurrences || 10
       );
    } else if (dto.recurrence && !eventType.allowRecurring) {
       throw new BadRequestException('This event type does not allow recurring bookings.');
    }

    let transactionResult;
    try {
      // 1. Evaluate availability of all requested slots using unified engine BEFORE transaction
      const evaluatedOccurrences = await this.availabilityEngine.evaluateTeamSlots(
        targetHostIds, 
        dto.eventTypeId,
        schedulingType,
        occurrencesToAttempt
      );

      // If it's a single booking and it's invalid, throw immediately
      if (!dto.recurrence) {
        const singleResult = evaluatedOccurrences[0];
        if (!singleResult.isAvailable) {
          throw new BadRequestException(singleResult.reason || 'Time slot is no longer available');
        }
      }

      // If it's recurring and NO slots are available, throw immediately
      if (dto.recurrence && evaluatedOccurrences.every(o => !o.isAvailable)) {
         throw new BadRequestException('All requested occurrences are unavailable or blocked.');
      }

      transactionResult = await this.prisma.$transaction(async (tx) => {
        // Optimistic Concurrency Control (OCC): lock all involved hosts
        for (const h of hosts) {
          await tx.user.update({
            where: { id: h.id, bookingVersion: h.bookingVersion },
            data: { bookingVersion: { increment: 1 } }
          });
        }

        let seriesId: string | undefined = undefined;
        if (dto.recurrence && eventType.allowRecurring) {
           const series = await tx.bookingSeries.create({
             data: {
               hostId: primaryHost.id,
               eventTypeId: dto.eventTypeId,
               frequency: dto.recurrence.frequency,
               interval: dto.recurrence.interval,
               count: occurrencesToAttempt.length,
               timezone: timezone
             }
           });
           seriesId = series.id;
        }

        const successfulOccurrences: any[] = [];
        const skippedOccurrences: any[] = [];

        for (const occ of evaluatedOccurrences) {
           if (!occ.isAvailable) {
              skippedOccurrences.push({ ...occ, reason: occ.reason });
              continue;
           }

           let assignedHostIds = occ.availableHostIds || [];

           if (schedulingType === 'ROUND_ROBIN') {
              // Determine least busy host
              let leastBusyHost = null;
              let minCount = Infinity;
              
              for (const hId of assignedHostIds) {
                const count = await tx.booking.count({
                  where: { hostId: hId, status: 'CONFIRMED' }
                });
                if (count < minCount || (count === minCount && (!leastBusyHost || hId < leastBusyHost))) {
                  minCount = count;
                  leastBusyHost = hId;
                }
              }

              if (!leastBusyHost) {
                skippedOccurrences.push({ ...occ, reason: 'No host available due to concurrency.' });
                continue;
              }
              assignedHostIds = [leastBusyHost];
           }

           const occBufferBefore = eventType.bufferBefore || 0;
           const occBufferAfter = eventType.bufferAfter || 0;
           const effectiveOccStart = new Date(occ.startTime.getTime() - occBufferBefore * 60000);
           const effectiveOccEnd = new Date(occ.endTime.getTime() + occBufferAfter * 60000);
           
           if (!eventType.isGroupEvent) {
             const potentialOverlaps = await tx.booking.findMany({
               where: {
                 hostId: { in: assignedHostIds },
                 status: { in: ['CONFIRMED', 'RESCHEDULED'] },
                 startTime: { gte: new Date(effectiveOccStart.getTime() - 24 * 60 * 60 * 1000) },
                 endTime: { lte: new Date(effectiveOccEnd.getTime() + 24 * 60 * 60 * 1000) }
               },
               include: { eventType: true }
             });

             const overlapping = potentialOverlaps.find(b => {
               const bBufferBefore = b.eventType?.bufferBefore || 0;
               const bBufferAfter = b.eventType?.bufferAfter || 0;
               const bStart = new Date(b.startTime.getTime() - bBufferBefore * 60000);
               const bEnd = new Date(b.endTime.getTime() + bBufferAfter * 60000);
               return bStart.getTime() < effectiveOccEnd.getTime() && bEnd.getTime() > effectiveOccStart.getTime();
             });
             
             if (overlapping) {
               throw new ConflictException('Time slot is no longer available. It was booked concurrently.');
             }
           } else {
             // Collective Group Events are theoretically possible but logically complex.
             // We'll assume the primary host count dictates group sizes.
             const groupBookingsCount = await tx.booking.count({
               where: {
                 hostId: assignedHostIds[0],
                 eventTypeId: dto.eventTypeId,
                 status: { in: ['CONFIRMED', 'RESCHEDULED'] },
                 startTime: occ.startTime,
                 endTime: occ.endTime
               }
             });
             if (groupBookingsCount >= eventType.maxInvitees) {
                throw new ConflictException('Group event time slot is fully booked.');
             }
             
             const potentialOtherOverlaps = await tx.booking.findMany({
               where: {
                 hostId: { in: assignedHostIds },
                 eventTypeId: { not: dto.eventTypeId },
                 status: { in: ['CONFIRMED', 'RESCHEDULED'] },
                 startTime: { gte: new Date(effectiveOccStart.getTime() - 24 * 60 * 60 * 1000) },
                 endTime: { lte: new Date(effectiveOccEnd.getTime() + 24 * 60 * 60 * 1000) }
               },
               include: { eventType: true }
             });
             
             const otherEventOverlap = potentialOtherOverlaps.find(b => {
               const bBufferBefore = b.eventType?.bufferBefore || 0;
               const bBufferAfter = b.eventType?.bufferAfter || 0;
               const bStart = new Date(b.startTime.getTime() - bBufferBefore * 60000);
               const bEnd = new Date(b.endTime.getTime() + bBufferAfter * 60000);
               return bStart.getTime() < effectiveOccEnd.getTime() && bEnd.getTime() > effectiveOccStart.getTime();
             });
             if (otherEventOverlap) {
                throw new ConflictException('Host is busy with another event.');
             }
           }

           const selectedPrimaryHostId = assignedHostIds[0];

           const booking = await tx.booking.create({
             data: {
               hostId: selectedPrimaryHostId,
               teamId: eventType.teamId,
               eventTypeId: dto.eventTypeId,
               guestName: dto.guestName,
               guestEmail: dto.guestEmail,
               guestPhone: dto.guestPhone,
               guestCompany: dto.guestCompany,
               guestNotes: dto.guestNotes,
               startTime: occ.startTime,
               endTime: occ.endTime,
               status: 'CONFIRMED',
               bookingSeriesId: seriesId,
               seriesOccurrenceNumber: occ.occurrenceNumber,
               answers: {
                 create: dbAnswers
               },
               assignedHosts: {
                 create: assignedHostIds.map(uId => ({
                   userId: uId,
                   role: uId === selectedPrimaryHostId ? 'ORGANIZER' : 'HOST'
                 }))
               }
             },
             include: {
               eventType: true,
               host: { include: { profile: true } },
               assignedHosts: { include: { user: { include: { profile: true, integrations: true } } } }
             }
           });
           
           successfulOccurrences.push(booking);
        }

        if (successfulOccurrences.length === 0) {
           throw new BadRequestException('All requested time slots are unavailable.');
        }

        if (dto.singleUseToken) {
           await tx.singleUseLink.update({
             where: { tokenHash: dto.singleUseToken },
             data: { used: true }
           });
        }

        return { successfulOccurrences, skippedOccurrences, seriesId };
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ConflictException('Concurrent booking detected. Please try again.');
      }
      throw error;
    }

    const { successfulOccurrences, skippedOccurrences, seriesId } = transactionResult;

    // After transaction succeeds, fire off side effects
    for (const booking of successfulOccurrences) {
      const assignedHosts = booking.assignedHosts.map((ah: any) => ah.user);
      const guestName = booking.guestName;
      const guestEmail = booking.guestEmail;
      const eventTitle = booking.eventType.title;
      const startTimeIso = booking.startTime.toISOString();
      const endTimeIso = booking.endTime.toISOString();

      // Create external calendar events for all assigned hosts
      for (const h of assignedHosts) {
        if (h.integrations && h.integrations.length > 0) {
          try {
            await this.calendarService.createCalendarEvent(h.id, h.email, guestEmail, startTimeIso, endTimeIso, eventTitle);
          } catch (error: any) {
            this.logger.error(\`Failed to create external calendar event for host \${h.id}\`, error.stack);
          }
        }
      }

      // 4. Send Confirmation Emails to guest and all hosts
      for (const h of assignedHosts) {
        try {
          await this.emailService.sendBookingConfirmation(
            guestEmail,
            guestName,
            eventTitle,
            startTimeIso,
            booking.meetLink,
            booking.eventType.duration,
            h.profile?.name || 'Host',
            h.email,
            undefined, // cancelToken
            undefined // rescheduleToken
          );
        } catch (error: any) {
          this.logger.error(\`Failed to send confirmation email for booking \${booking.id}\`, error.stack);
        }
      }

      // 5. Send Slack Notification to all hosts if configured
      for (const h of assignedHosts) {
        try {
          await this.slackService.sendBookingNotification(h.id, guestName, guestEmail, startTimeIso, eventTitle);
        } catch (error: any) {
          this.logger.error(\`Failed to send Slack notification for booking \${booking.id}\`, error.stack);
        }
      }

      // Create Contact record for guest
      try {
        await this.contactsService.createOrUpdateContact(booking.hostId, guestName, guestEmail, booking.guestPhone, booking.guestCompany, booking.startTime);
      } catch (error: any) {
         this.logger.error(\`Failed to create contact for booking \${booking.id}\`, error.stack);
      }
    }

    return {
      message: 'Booking(s) created successfully',
      bookings: successfulOccurrences,
      skipped: skippedOccurrences,
      seriesId
    };
  }
`;

content = content.substring(0, startIndex) + newCreateBooking + content.substring(endIndex);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully rewrote createBooking');
