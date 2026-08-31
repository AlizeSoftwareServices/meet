const fs = require('fs');
const file = 'src/public/public.service.ts';
let content = fs.readFileSync(file, 'utf8');

const newMethod = `  async getAvailableSlots(username: string, eventSlug: string, dateStr: string, guestTimezone?: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: { user: true }
    });

    if (!profile) throw new NotFoundException('User not found');

    const eventType = await this.prisma.eventType.findUnique({
      where: { userId_slug: { userId: profile.userId, slug: eventSlug } }
    });

    if (!eventType || !eventType.isActive) {
      throw new NotFoundException('Event type not found or inactive');
    }

    const schedule = await this.availabilityEngine.getEffectiveAvailability(profile.userId, eventType.id);
    if (!schedule) {
      return []; // No availability configured
    }

    const hostTimezone = schedule.timezone || profile.timezone || 'UTC';
    const workingPeriods = this.availabilityEngine.getWorkingPeriodsForDate(dateStr, schedule, hostTimezone);

    if (workingPeriods.length === 0) return [];

    // Generate potential slots (divided by duration)
    const duration = eventType.duration;
    let potentialSlots: { startTime: Date, endTime: Date }[] = [];

    for (const period of workingPeriods) {
      let current = period.start;
      while (isBefore(addMinutes(current, duration), period.end) || addMinutes(current, duration).getTime() === period.end.getTime()) {
        potentialSlots.push({
          startTime: current,
          endTime: addMinutes(current, duration)
        });
        current = addMinutes(current, duration); // simple strict slotting (e.g. 09:00, 09:30, 10:00)
      }
    }

    // Pass the potential slots through the unified Availability Engine
    const evaluatedSlots = await this.availabilityEngine.evaluateSlots(profile.userId, eventType.id, potentialSlots);

    // Map to frontend expected response
    const validSlots = evaluatedSlots
      .filter(s => s.isAvailable)
      .map(s => {
         return {
           startTime: s.startTime.toISOString(),
           endTime: s.endTime.toISOString(),
           spotsRemaining: eventType.isGroupEvent ? eventType.maxInvitees : 1
         };
      });

    return validSlots;
  }`;

// I will replace from `async getAvailableSlots(` until `  private createZonedDate(`
content = content.replace(/async getAvailableSlots\([\s\S]*?(?=  private createZonedDate\()/, newMethod + '\n\n');

fs.writeFileSync(file, content);
console.log('PublicService rewritten successfully');
