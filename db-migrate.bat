@echo off
REM Database migration helper script for Windows
REM This script provides easy access to database operations

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo.
    echo Database Migration Helper
    echo =======================
    echo.
    echo Usage: db-migrate.bat [command]
    echo.
    echo Commands:
    echo   test              Test database connection
    echo   migrate           Run all pending migrations
    echo   continue          Run migrations (continue on error^)
    echo   history           Show migration history
    echo   rollback          Mark last migration as rolled back
    echo   docker-up         Start Docker containers
    echo   docker-down       Stop Docker containers
    echo   docker-restart    Restart Docker containers
    echo   docker-logs       View Docker logs
    echo   docker-ps         Show container status
    echo.
    echo Examples:
    echo   db-migrate.bat test
    echo   db-migrate.bat migrate
    echo   db-migrate.bat docker-up
    echo.
    goto end
)

if "%~1"=="test" (
    echo Testing database connection...
    node db-migrate.js test
    goto end
)

if "%~1"=="migrate" (
    echo Running migrations...
    node db-migrate.js migrate
    goto end
)

if "%~1"=="continue" (
    echo Running migrations (continuing on error^)...
    node db-migrate.js migrate --continue-on-error
    goto end
)

if "%~1"=="history" (
    echo Showing migration history...
    node db-migrate.js history
    goto end
)

if "%~1"=="rollback" (
    echo Rolling back last migration...
    node db-migrate.js rollback
    goto end
)

if "%~1"=="docker-up" (
    echo Starting Docker containers...
    docker-compose up -d
    echo.
    docker-compose ps
    goto end
)

if "%~1"=="docker-down" (
    echo Stopping Docker containers...
    docker-compose down
    goto end
)

if "%~1"=="docker-restart" (
    echo Restarting Docker containers...
    docker-compose restart
    echo.
    docker-compose ps
    goto end
)

if "%~1"=="docker-logs" (
    echo Showing Docker logs...
    docker-compose logs -f postgres
    goto end
)

if "%~1"=="docker-ps" (
    echo Container status:
    docker-compose ps
    goto end
)

echo Unknown command: %~1

:end
endlocal
pause
