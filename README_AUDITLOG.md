# AuditLog Migration & Usage

This repository now supports an `AuditLog` model for lightweight append-only auditing of key mutations.

## Model Snapshot (Prisma)

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  actorUserId   String
  entityType    String
  entityId      String
  action        String
  before        Json?
  after         Json?
  changed       Json?
  correlationId String?
  ip            String?
  userAgent     String?
  createdAt     DateTime @default(now())

  @@index([entityType, entityId, createdAt])
  @@index([actorUserId, createdAt])
}
```

## Migration Template

A PostgreSQL-safe idempotent template is provided:
`prisma/templates/audit_log_migration.template.sql`

Copy it into a new migration folder if you need to reapply or in downstream environments:

```bash
cp prisma/templates/audit_log_migration.template.sql prisma/migrations/$(date +%Y%m%d%H%M%S)_ensure_audit_log/migration.sql
```

The block uses a `DO $$ BEGIN ... END $$;` guard to only create the table & indexes if missing.

## Writing Audit Entries

Use the helper in `src/server/audit.ts`:

```ts
import { writeAuditLog, auditWithDiff, diffObjects } from "@/server/audit";

await writeAuditLog({
  actorUserId: user.id,
  entityType: "charter",
  entityId: charter.id,
  action: "update",
  before: prev,
  after: next,
  changed: diffObjects(prev, next), // optional (use auditWithDiff instead for convenience)
  correlationId: requestId,
  ip: clientIp,
  userAgent: ua,
});

await auditWithDiff({
  actorUserId: user.id,
  entityType: "trip",
  entityId: trip.id,
  action: "edit",
  before: prevTrip,
  after: newTrip,
});
```

## Options & Environment Flags

`writeAuditLog(input, { strict, disabled, scrub })`

- `strict`: rethrow on failure (default swallows errors)
- `disabled`: force skip
- `scrub`: transform payloads before persistence (e.g. strip PII)

Environment:

- Set `AUDIT_DISABLED=1` to globally disable writes (e.g. in local load tests).

## Storage & Size Considerations

- `before/after/changed` are JSONB; avoid dumping massive nested objects. The helper serialiser truncates depth > 4 and arrays > 50 items.
- Use `scrub` to hash or remove sensitive fields.

## Query Examples

Recent actor actions:

```sql
SELECT action, entityType, entityId, createdAt
FROM "AuditLog"
WHERE "actorUserId" = $1
ORDER BY "createdAt" DESC
LIMIT 50;
```

Changes to a charter:

```sql
SELECT action, changed, createdAt
FROM "AuditLog"
WHERE "entityType" = 'charter' AND "entityId" = $1
ORDER BY "createdAt" DESC;
```

## Testing Strategy

- Unit test `diffObjects` for simple object vs non-object cases.
- (Optional) integration test using a test schema or a shadow DB.

## Future Enhancements

- Add TTL / partitioning if table grows quickly.
- Introduce category enums instead of free-form `entityType` / `action`.
- Background queue / batch writer for very high throughput paths.
