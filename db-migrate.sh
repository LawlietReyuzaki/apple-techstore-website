#!/bin/bash
# Database migration helper script for macOS/Linux
# This script provides easy access to database operations

set -e

print_usage() {
  cat << EOF

🗄️  Database Migration Helper
=============================

Usage: ./db-migrate.sh [command]

Commands:
  test              Test database connection
  migrate           Run all pending migrations
  continue          Run migrations (continue on error)
  history           Show migration history
  rollback          Mark last migration as rolled back
  docker-up         Start Docker containers
  docker-down       Stop Docker containers
  docker-restart    Restart Docker containers
  docker-logs       View Docker logs
  docker-ps         Show container status

Examples:
  ./db-migrate.sh test
  ./db-migrate.sh migrate
  ./db-migrate.sh docker-up

EOF
}

if [ $# -eq 0 ]; then
  print_usage
  exit 0
fi

case "$1" in
  test)
    echo "🧪 Testing database connection..."
    node db-migrate.js test
    ;;
  migrate)
    echo "🔄 Running migrations..."
    node db-migrate.js migrate
    ;;
  continue)
    echo "🔄 Running migrations (continuing on error)..."
    node db-migrate.js migrate --continue-on-error
    ;;
  history)
    echo "📋 Showing migration history..."
    node db-migrate.js history
    ;;
  rollback)
    echo "⏮️  Rolling back last migration..."
    node db-migrate.js rollback
    ;;
  docker-up)
    echo "🚀 Starting Docker containers..."
    docker-compose up -d
    echo ""
    docker-compose ps
    ;;
  docker-down)
    echo "🛑 Stopping Docker containers..."
    docker-compose down
    ;;
  docker-restart)
    echo "🔄 Restarting Docker containers..."
    docker-compose restart
    echo ""
    docker-compose ps
    ;;
  docker-logs)
    echo "📜 Showing Docker logs..."
    docker-compose logs -f postgres
    ;;
  docker-ps)
    echo "📊 Container status:"
    docker-compose ps
    ;;
  *)
    echo "❌ Unknown command: $1"
    print_usage
    exit 1
    ;;
esac
