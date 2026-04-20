@echo off
REM ===========================================================================
REM HomeFix - One-command launcher (Windows)
REM ---------------------------------------------------------------------------
REM What this script does, in order:
REM   1. Starts the PostgreSQL container via docker compose
REM   2. Waits until Postgres answers `pg_isready` (up to 20 seconds)
REM   3. Applies Django migrations (idempotent - safe to run repeatedly)
REM   4. Seeds the database ONLY if it's empty (checks for any non-admin user)
REM   5. Launches the Django dev server on http://localhost:8000
REM
REM Prereqs (run once, manually, before the first `start.bat`):
REM   cd backend
REM   python -m venv venv
REM   venv\Scripts\activate
REM   pip install -r requirements.txt
REM   cd ..\database
REM   copy .env.example .env
REM
REM Also open frontend-part\index.html in a browser (or use Live Server in
REM VS Code on http://localhost:3000 so CORS matches the backend settings).
REM ===========================================================================

setlocal

REM ------ [1/4] Start the Postgres container ---------------------------------
echo.
echo [1/4] Starting PostgreSQL container...
pushd "%~dp0database"
docker compose up -d
if errorlevel 1 (
    echo ERROR: docker compose failed. Is Docker Desktop running?
    popd
    exit /b 1
)
popd

REM ------ [2/4] Wait for the DB to become healthy ----------------------------
echo.
echo [2/4] Waiting for database to become healthy...
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

REM ------ [3/4] Migrate + (first-run only) seed ------------------------------
echo.
echo [3/4] Applying Django migrations...
pushd "%~dp0backend"
if not exist venv (
    echo ERROR: backend\venv not found. Run the one-time setup first:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
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

REM Ask Django whether any non-admin user already exists. If not, seed.
REM PYTHONUTF8=1 is mandatory here: the seed file contains Turkish characters
REM (Ozkan, Cinar, Ilkay, Gunes, ...) and without UTF-8 mode Python on Windows
REM reads them via cp1254 and silently replaces them with '?' before they
REM hit Postgres - resulting in corrupted names in the database.
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
for /f "usebackq" %%R in (`python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); from services.models import User; print('EMPTY' if User.objects.exclude(username='admin').count() == 0 else 'POPULATED')"`) do set DB_STATE=%%R

if "%DB_STATE%"=="EMPTY" (
    echo Database is empty - loading seed data ^(32 customers, 30 workers, ...^)
    python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); exec(open('../database/seed_django.py', encoding='utf-8').read())"
    if errorlevel 1 (
        echo ERROR: seed failed.
        popd
        exit /b 1
    )
) else (
    echo Database already has data - skipping seed.
)

REM ------ [4/4] Start the backend (blocking) ---------------------------------
echo.
echo ===========================================================================
echo   Backend running on http://localhost:8000
echo   Open frontend-part\index.html in your browser (or Live Server)
echo.
echo   Seeded login credentials:
echo     Admin     admin          / Admin1234!
echo     Customer  ayse_kaya      / Customer1234!
echo     Worker    kadir_elektrik / Worker1234!
echo.
echo   Ctrl+C to stop.
echo ===========================================================================
echo.
python manage.py runserver 8000
popd

endlocal
