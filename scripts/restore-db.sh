#!/bin/bash

# Database Restore Script for fishon-market
# Usage: ./scripts/restore-db.sh <backup-file>
#
# This script restores a PostgreSQL database from a backup file

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: No backup file specified${NC}"
  echo "Usage: ./scripts/restore-db.sh <backup-file>"
  echo ""
  echo "Available backups:"
  ls -lh ./backups/*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep DATABASE_URL | xargs)
else
  echo -e "${RED}❌ Error: .env file not found${NC}"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL not found in .env${NC}"
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ Error: psql not found${NC}"
  echo "Install PostgreSQL client tools:"
  echo "  macOS: brew install postgresql"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# Warning
echo -e "${RED}⚠️  WARNING: This will DROP ALL DATA in the current database!${NC}"
echo "Database: fishon-captain"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Restore cancelled${NC}"
  exit 0
fi

# Create a safety backup of current state
echo -e "${YELLOW}📦 Creating safety backup of current state...${NC}"
./scripts/backup-db.sh "pre-restore"
echo ""

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo -e "${YELLOW}Decompressing backup file...${NC}"
  TEMP_FILE=$(mktemp)
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
  RESTORE_FILE="$TEMP_FILE"
else
  RESTORE_FILE="$BACKUP_FILE"
fi

# Drop and recreate database
echo -e "${YELLOW}Dropping existing database...${NC}"
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || {
  echo -e "${RED}❌ Failed to drop database${NC}"
  exit 1
}

# Restore from backup
echo -e "${YELLOW}Restoring database...${NC}"
if psql "$DATABASE_URL" < "$RESTORE_FILE" 2>/dev/null; then
  echo -e "${GREEN}✅ Database restored successfully!${NC}"
  
  # Cleanup temp file
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm "$TEMP_FILE"
  fi
  
  # Verify restore
  echo ""
  echo -e "${YELLOW}Verifying restore...${NC}"
  TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
  echo "Tables restored: $TABLE_COUNT"
  
else
  echo -e "${RED}❌ Restore failed${NC}"
  # Cleanup temp file
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm "$TEMP_FILE"
  fi
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Restore complete!${NC}"
echo -e "${YELLOW}⚠️  Don't forget to run: npx prisma generate${NC}"
