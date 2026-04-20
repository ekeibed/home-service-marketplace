@echo off
REM ===========================================================================
REM HomeFix — Windows one-shot starter
REM ---------------------------------------------------------------------------
REM   1. Starts the Postgres container (if not already up)
REM   2. Waits for the DB to become healthy
REM   3. Runs Django migrations (no-op when already applied)
REM   4. Launches the Django dev server on http://localhost:8000
REM
REM First-time users: also run `seed.bat` once to load demo data, then open
REM frontend-part\index.html in a browser (or via VS Code Live Server).
REM ===========================================================================

setlocal

echo.
echo [1/3] Starting PostgreSQL container...
pushd "%~dp0database"
docker compose up -d
if errorlevel 1 (
    echo ERROR: docker compose failed. Is Docker Desktop running?
    popd
    exit /b 1
)
popd

echo.
echo [2/3] Waiting for database to become healthy...
set /a tries=0
:wait_db
set /a tries+=1
docker exec hsm_postgres pg_isready -q
if errorlevel 1 (
    if %tries% GEQ 20 (
        echo ERROR: database did not become ready within 20 seconds.
        exit /b 1
    )
    timeout /t 1 /nobreak >nul
    goto wait_db
)
echo Database is ready.

echo.
echo [3/3] Applying Django migrations and starting backend...
pushd "%~dp0backend"
if not exist venv (
    echo ERROR: backend\venv not found. Run setup first:
    echo   cd backend ^&^& python -m venv venv ^&^& venv\Scripts\activate ^&^& pip install -r requirements.txt
    popd
    exit /b 1
)
call venv\Scripts\activate
python manage.py migrate --noinput
if errorlevel 1 (
    echo ERROR: migrate failed.
    popd
    exit /b 1
)

echo.
echo ===========================================================================
echo   Backend starting on http://localhost:8000
echo   Open frontend-part\index.html in your browser (or use Live Server)
echo   Ctrl+C to stop the server
echo ===========================================================================
echo.
python manage.py runserver 8000
popd

endlocal
