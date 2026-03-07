.PHONY: help docker-up docker-down docker-restart docker-logs docker-ps test migrate history rollback install clean

# Default target
help:
	@echo "🗄️  Database Management Commands"
	@echo "=================================="
	@echo ""
	@echo "Database Commands:"
	@echo "  make test              - Test database connection"
	@echo "  make migrate           - Run all pending migrations"
	@echo "  make migrate-continue  - Run migrations (continue on error)"
	@echo "  make history           - Show migration history"
	@echo "  make rollback          - Mark last migration as rolled back"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-up         - Start PostgreSQL and pgAdmin"
	@echo "  make docker-down       - Stop containers (data persists)"
	@echo "  make docker-restart    - Restart containers"
	@echo "  make docker-logs       - View PostgreSQL logs"
	@echo "  make docker-ps         - Show container status"
	@echo "  make docker-clean      - Stop and remove containers"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make install           - Install dependencies"
	@echo "  make setup             - Complete setup (install + docker + migrate)"
	@echo "  make clean             - Remove containers and volumes (⚠️  DELETES DATA)"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make psql              - Open psql shell in PostgreSQL"
	@echo ""

# Database commands
test:
	@echo "🧪 Testing database connection..."
	node db-migrate.js test

migrate:
	@echo "🔄 Running migrations..."
	node db-migrate.js migrate

migrate-continue:
	@echo "🔄 Running migrations (continue on error)..."
	node db-migrate.js migrate --continue-on-error

history:
	@echo "📋 Migration history..."
	node db-migrate.js history

rollback:
	@echo "⏮️  Rolling back last migration..."
	node db-migrate.js rollback

# Docker commands
docker-up:
	@echo "🚀 Starting Docker containers..."
	docker-compose up -d
	@echo ""
	@echo "Container status:"
	@docker-compose ps

docker-down:
	@echo "🛑 Stopping Docker containers..."
	docker-compose down

docker-restart:
	@echo "🔄 Restarting Docker containers..."
	docker-compose restart
	@echo ""
	@docker-compose ps

docker-logs:
	@echo "📜 PostgreSQL logs (Ctrl+C to exit)..."
	docker-compose logs -f postgres

docker-ps:
	@echo "📊 Container status:"
	docker-compose ps

docker-clean:
	@echo "🧹 Removing containers..."
	docker-compose down -v

# Setup commands
install:
	@echo "📦 Installing dependencies..."
	npm install

setup: install docker-up test migrate
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Your database is ready!"
	@echo "  URL: postgresql://admin:123456@localhost:5433/mydatabase"
	@echo "  pgAdmin: http://localhost:5050"

clean:
	@echo "⚠️  WARNING: This will delete all data!"
	@echo "⚠️  Press Ctrl+C to cancel, or wait 5 seconds..."
	@sleep 5
	docker-compose down -v
	@echo "✅ Cleaned up"

# Utility commands
psql:
	@docker-compose exec postgres psql -U admin -d mydatabase

# Aliases
start: docker-up
stop: docker-down
restart: docker-restart
logs: docker-logs
status: docker-ps
test-db: test
run-migrations: migrate

.DEFAULT_GOAL := help
