# Production Database Readiness Checklist

**Database Target**: PostgreSQL 14+ (or MongoDB if configured)  
**ORM**: Prisma v5.22.0  
**Schema File**: `backend/prisma/schema.prisma`  

---

## 1. Schema & Relational Integrity Audit

| Model | Primary Keys / Indexes | Relations & Integrity | Cascade / Constraint Safety |
|-------|------------------------|-----------------------|----------------------------|
| `User` | `@id`, `@unique(email)` | `profile`, `eventTypes`, `bookings`, `teams`, `webhooks` | Historical bookings preserved |
| `Profile` | `@id`, `@unique(userId)`, `@unique(username)` | Relates 1:1 to `User` | Cascades with User deletion |
| `EventType` | `@id`, `@unique(userId, slug)` | `customQuestions`, `hosts`, `bookings`, `team` | Unique per user slug constraint |
| `Booking` | `@id`, `@unique(uid)` | `eventType`, `hosts`, `payments` | Prevents slot double booking via OCC |
| `BookingHost` | `@id`, `@@unique([bookingId, userId])` | Links co-hosts to booking | Multi-host collective visibility |
| `EventTypeHost` | `@id`, `@@unique([eventTypeId, userId])` | Links team members to event type | Round Robin & Collective host pools |
| `PushToken` | `@id`, `@unique(token)` | Relates to `User` | Upsert prevents duplicate push registrations |
| `Webhook` | `@id` | `deliveries` | Relates to `User` with IDOR isolation |
| `WebhookDelivery` | `@id` | Relates to `Webhook` | Preserves HTTP dispatch audit logs |
| `RoutingForm` | `@id`, `@unique(userId, slug)` | `questions`, `rules` | Isolated per user namespace |
| `Availability` | `@id` | `slots`, `overrides` | Fast schedule querying |

---

## 2. Production Deployment & Migration Best Practices

### Safe Migration Command
For production deployment, always use:
```bash
npx prisma migrate deploy
```
> **CAUTION**: Never run `npx prisma migrate reset` or `npx prisma db push --force-reset` in a production environment as it will drop all customer tables and data.

### Connection Pooling
- Ensure PostgreSQL connection pooling is enabled (e.g. PgBouncer or Supabase connection pooling) when deploying in serverless or multi-instance container environments.
- Format: `DATABASE_URL="postgresql://user:password@pooler.host:6543/meetdb?pgbouncer=true"`

### Backup & Recovery
- Configure daily automated WAL backups / snapshot replication on production database instances.
