@echo off
REM ===========================================================================
REM HomeFix — Seed demo data (32 customers, 30 workers, categories, requests)
REM ---------------------------------------------------------------------------
REM Run this once after first-time setup (or any time you want to re-populate
REM demo data). Requires:
REM   - PostgreSQL container already running (run `start.bat` first, or
REM     `cd database && docker compose up -d`)
REM   - backend\venv already set up with requirements installed
REM
REM The PYTHONUTF8=1 prefix is REQUIRED on Windows to stop the default
REM cp1254 console encoding from mangling Turkish characters (Ö, Ç, İ, …)
REM as they flow through the Python -> psycopg2 -> Postgres pipeline.
REM ===========================================================================

setlocal

pushd "%~dp0backend"
if not exist venv (
    echo ERROR: backend\venv not found. Create it first:
    echo   cd backend ^&^& python -m venv venv ^&^& venv\Scripts\activate ^&^& pip install -r requirements.txt
    popd
    exit /b 1
)

echo Seeding database (this re-uses existing rows where possible)...
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
venv\Scripts\python.exe -c "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); django.setup(); exec(open('../database/seed_django.py', encoding='utf-8').read())"
if errorlevel 1 (
    echo ERROR: seed failed.
    popd
    exit /b 1
)
popd

echo.
echo Done. You can log in with:
echo   admin      / Admin1234!
echo   ayse_kaya  / Customer1234!
echo   kadir_elektrik / Worker1234!
endlocal
