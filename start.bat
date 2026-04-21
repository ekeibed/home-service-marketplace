@echo off
REM ===========================================================================
REM HomeFix - One-click launcher (Windows)
REM ===========================================================================
REM Double-click this file from File Explorer. It will:
REM   1. Start the PostgreSQL container (Docker)
REM   2. Wait until the database is healthy
REM   3. Run Django migrations
REM   4. Seed the database if it's empty (first run only)
REM   5. Start the frontend HTTP server on http://localhost:3000 (background)
REM   6. Open http://localhost:3000 in your default browser automatically
REM   7. Start the Django backend on http://localhost:8000 (foreground)
REM
REM Press Ctrl+C to stop everything.
REM ===========================================================================

setlocal

REM Resolve the project root (where this .bat lives)
set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend-part"
set "VENV_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"
set "SEED_SCRIPT=%PROJECT_ROOT%database\seed_django.py"

REM ------ Preflight: check venv exists ---------------------------------------
if not exist "%VENV_PYTHON%" (
    echo.
    echo ERROR: backend\venv not found. Run the one-time setup first:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

REM ------ [1/5] Start the Postgres container ---------------------------------
echo.
echo [1/5] Starting PostgreSQL container...
pushd "%PROJECT_ROOT%database"
docker compose up -d
if errorlevel 1 (
    echo ERROR: docker compose failed. Is Docker Desktop running?
    popd
    pause
    exit /b 1
)
popd

REM ------ [2/5] Wait for the DB to become healthy ----------------------------
echo.
echo [2/5] Waiting for database to become healthy...
set /a tries=0
:wait_db
set /a tries+=1
docker exec hsm_postgres pg_isready -q
if errorlevel 1 (
    if %tries% GEQ 20 (
        echo ERROR: database did not become ready within 20 seconds.
        pause
        exit /b 1
    )
    timeout /t 1 /nobreak >nul
    goto wait_db
)
echo Database is ready.

REM ------ [3/5] Migrate + seed -----------------------------------------------
echo.
echo [3/5] Applying Django migrations...

REM Use the venv python directly — no need to activate
"%VENV_PYTHON%" "%BACKEND_DIR%\manage.py" migrate --noinput
if errorlevel 1 (
    echo ERROR: migrate failed.
    pause
    exit /b 1
)

REM Seed only if the database is empty (no non-admin users yet)
echo Checking if seed is needed...
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

"%VENV_PYTHON%" -c "import os, sys, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); sys.path.insert(0, r'%BACKEND_DIR%'); django.setup(); from services.models import User; sys.exit(0 if User.objects.exclude(username='admin').count() == 0 else 1)"

if not errorlevel 1 (
    echo Database is empty - loading seed data...
    "%VENV_PYTHON%" -c "import os, sys, django; sys.path.insert(0, r'%BACKEND_DIR%'); os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); exec(open(r'%SEED_SCRIPT%', encoding='utf-8').read())"
    if errorlevel 1 (
        echo ERROR: seed failed.
        pause
        exit /b 1
    )
) else (
    echo Database already has data - skipping seed.
)



REM ------ [4/5] Start frontend HTTP server (background) ----------------------
echo.
echo [4/5] Starting frontend server on http://localhost:3000 ...

REM Kill any leftover http.server on port 3000 from a previous run
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%P /F >nul 2>&1
)

REM Launch Python HTTP server in the frontend folder (background, same window)
start "HomeFix Frontend" /B /D "%FRONTEND_DIR%" python -m http.server 3000 >nul 2>&1

REM Give it a moment to bind the port
timeout /t 2 /nobreak >nul

REM ------ [5/5] Open browser + start backend ---------------------------------
echo.
echo [5/5] Opening browser and starting backend...

REM Open the site in the default browser
start "" "http://localhost:3000"

echo.
echo ===========================================================================
echo.
echo   HomeFix is running!
echo.
echo   Frontend : http://localhost:3000   (opened in browser)
echo   Backend  : http://localhost:8000
echo.
echo   Login credentials:
echo     Admin     admin          / Admin1234!
echo     Customer  ayse_kaya      / Customer1234!
echo     Worker    kadir_elektrik / Worker1234!
echo.
echo   Press Ctrl+C to stop backend. Frontend stops with it.
echo ===========================================================================
echo.

"%VENV_PYTHON%" "%BACKEND_DIR%\manage.py" runserver 8000

REM When backend stops (Ctrl+C), also kill the frontend server
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%P /F >nul 2>&1
)
echo.
echo HomeFix stopped.

endlocal
