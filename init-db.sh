#!/bin/bash
# PostgreSQL initialization script
# This script runs after the database is created

set -e

echo "🚀 Starting PostgreSQL initialization..."

# Enable UUID extension
psql -U admin -d mydatabase << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
SELECT 'PostgreSQL extensions enabled' as status;
EOF

echo "✅ PostgreSQL initialization completed successfully!"
