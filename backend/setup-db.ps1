# Run this once after PostgreSQL is installed
# Usage: .\setup-db.ps1 -PgPassword <your_postgres_superuser_password>

param(
    [string]$PgPassword = "postgres",
    [string]$PgBin = "C:\Program Files\PostgreSQL\17\bin"
)

$env:PGPASSWORD = $PgPassword
$psql = Join-Path $PgBin "psql.exe"

Write-Host "Creating zeyvo user..." -ForegroundColor Cyan
& $psql -U postgres -c "CREATE USER zeyvo WITH PASSWORD 'changeme';" 2>&1

Write-Host "Creating zeyvo database..." -ForegroundColor Cyan
& $psql -U postgres -c "CREATE DATABASE zeyvo OWNER zeyvo;" 2>&1

Write-Host "Creating app schema..." -ForegroundColor Cyan
& $psql -U postgres -d zeyvo -c "CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION zeyvo;" 2>&1

Write-Host "Granting privileges..." -ForegroundColor Cyan
& $psql -U postgres -d zeyvo -c "GRANT ALL PRIVILEGES ON DATABASE zeyvo TO zeyvo;" 2>&1
& $psql -U postgres -d zeyvo -c "GRANT ALL ON SCHEMA app TO zeyvo;" 2>&1

Write-Host "Done. Run the backend with: .\gradlew.bat :app:bootRun --args='--spring.profiles.active=local'" -ForegroundColor Green
