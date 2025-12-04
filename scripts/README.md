# Database Backup & Migration Strategy

## 🎯 Overview

This directory contains scripts for safely backing up and migrating the fishon-market PostgreSQL database.

## 📦 Scripts

### 1. `backup-db.sh` - Create Database Backup

Creates a compressed backup of the entire database.

```bash
# Create backup with default name
./scripts/backup-db.sh

# Create backup with custom name
./scripts/backup-db.sh my-backup-name
```

**Features:**

- Automatic timestamping
- Gzip compression
- Keeps last 10 backups (auto-cleanup)
- Stored in `./backups/` directory

### 2. `restore-db.sh` - Restore from Backup

Restores the database from a backup file.

```bash
# List available backups
ls -lh ./backups/

# Restore from backup
./scripts/restore-db.sh ./backups/pre-migration_20251107_025630.sql.gz
```

**Safety Features:**

- Confirmation prompt before restore
- Creates safety backup of current state
- Verifies restore completion

### 3. `safe-migrate.sh` - Safe Migration Workflow

Runs migrations with automatic backup and verification.

```bash
./scripts/safe-migrate.sh add_user_preferences
```

**Workflow:**

1. ✅ Creates pre-migration backup
2. ✅ Creates migration file
3. ✅ Shows migration SQL for review
4. ✅ Waits for confirmation
5. ✅ Applies migration
6. ✅ Verifies success
7. ✅ Regenerates Prisma client

### 4. `backfill-captain-earnings.ts` - Backfill Missing Financial Data

Finds PAID/COMPLETED bookings missing `captainEarnings` and calculates/updates them.

```bash
# Dry run (show what would be updated)
npx tsx scripts/backfill-captain-earnings.ts --dry-run

# Apply changes
npx tsx scripts/backfill-captain-earnings.ts
```

**Features:**

- Calculates platformFee, serviceFee, captainEarnings
- Uses correct commission rate based on charter pricing plan (GOLD: 5%, SILVER: 8%, BASIC: 10%)
- Sets payoutStatus to PENDING for eligible bookings

### 5. `create-missing-payouts.ts` - Create Payout Batches

Creates payout records for all eligible bookings that haven't been included in any payout batch.

```bash
# Dry run (show what would be created)
npx tsx scripts/create-missing-payouts.ts --dry-run

# Create payouts for eligible bookings only (past 3-day buffer)
npx tsx scripts/create-missing-payouts.ts

# Include ALL pending bookings (even future trips)
npx tsx scripts/create-missing-payouts.ts --include-all
```

**Features:**

- Groups bookings by captain
- Only includes captains with complete bank details
- Creates payout batch with PENDING status
- Updates booking payoutStatus to SCHEDULED

## 🚀 Usage Examples

### Before Making Schema Changes

```bash
# 1. Create a backup first
./scripts/backup-db.sh pre-schema-change

# 2. Make your Prisma schema changes
# Edit prisma/schema.prisma

# 3. Run safe migration
./scripts/safe-migrate.sh your_migration_name
```

### Manual Migration (Advanced)

```bash
# 1. Backup
./scripts/backup-db.sh

# 2. Create migration without applying
npx prisma migrate dev --name your_migration --create-only

# 3. Review the SQL
cat prisma/migrations/*/migration.sql

# 4. Apply migration
npx prisma migrate deploy

# 5. Generate client
npx prisma generate
```

### Emergency Rollback

```bash
# 1. List backups
ls -lh ./backups/

# 2. Restore from backup
./scripts/restore-db.sh ./backups/pre-migration_TIMESTAMP.sql.gz

# 3. Regenerate Prisma client
npx prisma generate
```

## ⚙️ Prerequisites

### macOS

```bash
brew install postgresql
```

### Ubuntu/Debian

```bash
sudo apt-get install postgresql-client
```

## 📁 Directory Structure

```plaintext
fishon-market/
├── backups/                 # Backup files (gitignored)
│   ├── pre-migration_20251107_025630.sql.gz
│   └── pre-restore_20251107_030120.sql.gz
├── scripts/
│   ├── backup-db.sh        # Backup script
│   ├── restore-db.sh       # Restore script
│   └── safe-migrate.sh     # Safe migration workflow
└── prisma/
    └── migrations/          # Migration history
```

## 🔒 Security Best Practices

1. **Never commit backups to git** - They're in `.gitignore`
2. **Store production backups externally** - Use Neon's backup features or S3
3. **Test migrations on staging first** - Never run untested migrations in production
4. **Keep backup retention** - Scripts keep last 10 backups automatically

## 🌩️ Neon-Specific Features

Neon provides additional backup options:

### Neon Branching (Recommended for Testing)

```bash
# Create a branch for testing migrations
neon branches create --name test-migration

# Get branch DATABASE_URL and test migration
# If successful, apply to main branch
```

### Neon Point-in-Time Restore

- Available in Neon dashboard
- Can restore to any point in the last 7 days (varies by plan)
- No need for manual backups in many cases

### Neon Restore via CLI

```bash
# Install Neon CLI
npm install -g neonctl

# List available restore points
neonctl branches list

# Create branch from historical point
neonctl branches create --name restored-branch --restore-to <timestamp>
```

## 📊 Backup Schedule Recommendations

### Development

- **Before each migration**: Use `safe-migrate.sh`
- **Before major refactors**: Manual backup
- **Keep**: Last 10 backups (automated)

### Staging

- **Daily automated backups**: Set up cron job
- **Before deployments**: Manual backup
- **Keep**: Last 30 days

### Production

- **Use Neon's built-in backups**: Point-in-time restore
- **Daily automated backups to S3**: For compliance
- **Before deployments**: Manual backup
- **Keep**: 90 days minimum

## 🔧 Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools (see Prerequisites)

### "psql: could not connect"

Check your `DATABASE_URL` in `.env` file

### Backup fails with permission error

Ensure DATABASE_URL has correct permissions and the Neon database is accessible

### Migration fails mid-way

1. Check error message
2. Restore from backup: `./scripts/restore-db.sh ./backups/pre-<migration>_*.sql.gz`
3. Fix issue in schema
4. Re-run migration

## 📝 Adding to package.json

Add these convenient npm scripts:

```json
{
  "scripts": {
    "db:backup": "./scripts/backup-db.sh",
    "db:restore": "./scripts/restore-db.sh",
    "db:migrate:safe": "./scripts/safe-migrate.sh",
    "db:migrate": "npx prisma migrate deploy && npx prisma generate"
  }
}
```

Then use:

```bash
npm run db:backup
npm run db:migrate:safe add_user_field
```

## 🎓 Learning More

- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Neon Branching](https://neon.tech/docs/introduction/branching)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)
