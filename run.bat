@echo off
echo Starting Sampaoguard Platform (Local AI - Free 100%)...
echo ===================================================

echo [1/3] Starting Node.js Express backend (Port 5001)...
start "Sampaoguard Backend (5001)" cmd /k "cd backend && npm run dev"

echo [2/3] Starting Python FastAPI AI Service (Port 8000)...
start "Sampaoguard AI Service (8000)" cmd /k "cd ai-service && .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [3/3] Starting Next.js 14 Frontend Web App (Port 3000)...
start "Sampaoguard Frontend (3000)" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo All services triggered in separate windows!
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5001
echo - AI Service: http://localhost:8000
echo ===================================================
pause
