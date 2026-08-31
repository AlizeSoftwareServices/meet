# Phase 4D Codebase Audit & Architecture Plan

## Current State

The current architecture is strictly host-centric:
- `User` has `EventType`s, `Availability`, `Booking`s, `Integration`s, etc.
- `Booking` maps to a single `hostId` and `eventTypeId`.
- `AvailabilityEngineService` evaluates slots based on a single `hostId` and optionally an `eventTypeId`.
- `BookingsService` verifies slots and creates bookings bound to a single host.

## Schema Modifications for Phase 4D

To implement team scheduling without breaking existing personal scheduling, we will extend the schema:

1. **Team and TeamMember**
   ```prisma
   model Team {
     id          String       @id @default(auto()) @map("_id") @db.ObjectId
     name        String
     slug        String       @unique
     description String?
     ownerId     String       @db.ObjectId
     owner       User         @relation("TeamOwner", fields: [ownerId], references: [id])
     isActive    Boolean      @default(true)
     members     TeamMember[]
     invitations TeamInvitation[]
     eventTypes  EventType[]
     createdAt   DateTime     @default(now())
     updatedAt   DateTime     @updatedAt
   }

   model TeamMember {
     id        String   @id @default(auto()) @map("_id") @db.ObjectId
     teamId    String   @db.ObjectId
     team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
     userId    String   @db.ObjectId
     user      User     @relation("TeamMemberships", fields: [userId], references: [id], onDelete: Cascade)
     role      String   // 'OWNER', 'ADMIN', 'MEMBER'
     status    String   @default("ACTIVE") // 'INVITED', 'ACTIVE'
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     @@unique([teamId, userId])
   }

   model TeamInvitation {
     id          String   @id @default(auto()) @map("_id") @db.ObjectId
     teamId      String   @db.ObjectId
     team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
     email       String
     role        String   // 'ADMIN', 'MEMBER'
     tokenHash   String   @unique
     expiresAt   DateTime
     acceptedAt  DateTime?
     createdAt   DateTime @default(now())
   }
   ```

2. **EventType Extension**
   Modify `EventType` to support teams:
   ```prisma
   model EventType {
     // ... existing fields ...
     teamId           String?         @db.ObjectId
     team             Team?           @relation(fields: [teamId], references: [id], onDelete: Cascade)
     schedulingType   String          @default("PERSONAL") // 'PERSONAL', 'ROUND_ROBIN', 'COLLECTIVE'
     hosts            EventTypeHost[]
   }

   model EventTypeHost {
     id          String    @id @default(auto()) @map("_id") @db.ObjectId
     eventTypeId String    @db.ObjectId
     eventType   EventType @relation(fields: [eventTypeId], references: [id], onDelete: Cascade)
     userId      String    @db.ObjectId
     user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
     createdAt   DateTime  @default(now())

     @@unique([eventTypeId, userId])
   }
   ```

3. **Booking Extension**
   Modify `Booking` to track team/assigned hosts.
   We can keep `hostId` to represent the *primary* assigned host (for ROUND_ROBIN) or the *organizer* (for COLLECTIVE) to maintain backward compatibility, and introduce `assignedHosts` for COLLECTIVE scheduling.
   ```prisma
   model Booking {
     // ... existing
     teamId        String?         @db.ObjectId
     team          Team?           @relation(fields: [teamId], references: [id], onDelete: SetNull)
     assignedHosts BookingHost[]
   }

   model BookingHost {
     id        String   @id @default(auto()) @map("_id") @db.ObjectId
     bookingId String   @db.ObjectId
     booking   Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
     hostId    String   @db.ObjectId
     host      User     @relation(fields: [hostId], references: [id], onDelete: Cascade)

     @@unique([bookingId, hostId])
   }
   ```

## Architecture Decisions

1. **Teams Module (`teams.module.ts`)**
   Will manage teams, team members, invitations, and team-level settings. Will implement permission checks using custom NestJS Guards or service-level checks.

2. **Availability Engine (`availability.engine.ts`)**
   Needs an extension to handle `ROUND_ROBIN` (union of available slots for eligible hosts) and `COLLECTIVE` (intersection of available slots for required hosts).

3. **Bookings Service (`bookings.service.ts`)**
   Needs to calculate the assigned host for `ROUND_ROBIN` and check all hosts for `COLLECTIVE`.
   - Before Prisma `$transaction`, query eligible hosts.
   - Run deterministic load balancing for ROUND_ROBIN (e.g., host with least recent bookings).
   - Check external conflicts for all assigned hosts.
   - Generate Google/Microsoft Calendar events for all assigned hosts.

4. **Security & Permissions**
   - Must implement IDOR checks on all Team endpoints.
   - Use decorators like `@RequireTeamRole('ADMIN')`.
   - Prevent invitation replay by marking `acceptedAt` atomically.
   - Expiration checking for tokens.

5. **Concurrency**
   - Bookings engine already uses `$transaction` and `bookingVersion` optimistic locking (or standard select constraints). For multi-host, we must check overlap for all selected hosts inside the transaction.

6. **Frontend UI**
   - `dashboard/teams`: List of teams.
   - `dashboard/teams/new`: Create team.
   - `dashboard/teams/[id]`: Manage team settings, members, invitations, event types.
   - `dashboard/events/new`: Add selector for Personal, Round Robin, or Collective.
