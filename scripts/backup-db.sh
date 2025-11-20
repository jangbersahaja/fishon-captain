#!/bin/bash

# Database Backup Script for fishon-market
# Usage: ./scripts/backup-db.sh [backup-name]
#
# This script creates a backup of the PostgreSQL database before migrations
# Backups are stored in ./backups/ directory with timestamps

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Create backups directory if it doesn't exist
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-pre-migration}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_${TIMESTAMP}.sql"

echo -e "${YELLOW}📦 Starting database backup...${NC}"
echo "Database: fishon-captain"
echo "Backup file: $BACKUP_FILE"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
  echo -e "${RED}❌ Error: pg_dump not found${NC}"
  echo "Install PostgreSQL client tools:"
  echo "  macOS: brew install postgresql"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  exit 1
fi

# Create backup using pg_dump
echo -e "${YELLOW}Creating backup...${NC}"
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
  # Compress the backup
  gzip "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gz"
  
  # Get file size
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  
  echo -e "${GREEN}✅ Backup completed successfully!${NC}"
  echo "File: $BACKUP_FILE"
  echo "Size: $SIZE"
  echo ""
  
  # List recent backups
  echo -e "${YELLOW}Recent backups:${NC}"
  ls -lh "$BACKUP_DIR" | tail -5
  echo ""
  
  # Cleanup old backups (keep last 10)
  echo -e "${YELLOW}Cleaning up old backups...${NC}"
  ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
  echo -e "${GREEN}✅ Cleanup complete (keeping last 10 backups)${NC}"
  
else
  echo -e "${RED}❌ Backup failed${NC}"
  exit 1
fi
