#!/usr/bin/env bash
set -e

echo "===================================="
echo "Starting SQL Quest (100 SQL Masterclass)"
echo "===================================="

# 1. Skip automatic seeding (seed disabled until all problems are completed)
# echo "[1/3] Skipping seed..."


# 2. Start backend server in background
echo "[2/3] Starting FastAPI Backend on http://localhost:8000 ..."
cd backend
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready before starting frontend
echo "Waiting for backend to be ready..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:8000/api/health >/dev/null 2>&1 || curl -s http://127.0.0.1:8000/ >/dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  sleep 0.5
done

# 3. Start frontend dev server
echo "[3/3] Starting Next.js Frontend on http://localhost:3000 ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT

wait $BACKEND_PID $FRONTEND_PID
