#!/bin/bash

# PR Reviewer Pro - Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting PR Reviewer Pro..."
echo ""

# Check if containers are running
echo "📦 Checking Docker containers..."
POSTGRES_STATUS=$(docker ps --filter "name=prr-postgres" --format "{{.Status}}" 2>/dev/null)
REDIS_STATUS=$(docker ps --filter "name=prr-redis" --format "{{.Status}}" 2>/dev/null)

if [ -z "$POSTGRES_STATUS" ] || [ -z "$REDIS_STATUS" ]; then
    echo "⚠️  Database containers not running. Starting them..."
    docker-compose up -d postgres redis
    echo "⏳ Waiting for databases to be ready..."
    sleep 5
else
    echo "✅ Database containers are running"
fi

echo ""
echo "🔧 Starting Backend API on port 3001..."
echo "   Log: apps/api/api.log"
cd apps/api
npm run dev > api.log 2>&1 &
API_PID=$!
echo "   Backend PID: $API_PID"

cd ../..

echo ""
echo "🎨 Starting Frontend on port 3000..."
echo "   Log: apps/web/web.log"
cd apps/web
npm run dev > web.log 2>&1 &
WEB_PID=$!
echo "   Frontend PID: $WEB_PID"

cd ../..

echo ""
echo "✅ PR Reviewer Pro is starting!"
echo ""
echo "📱 Access the application:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo ""
echo "📋 Process IDs:"
echo "   Backend:  $API_PID"
echo "   Frontend: $WEB_PID"
echo ""
echo "📝 View logs:"
echo "   Backend:  tail -f apps/api/api.log"
echo "   Frontend: tail -f apps/web/web.log"
echo ""
echo "🛑 To stop:"
echo "   kill $API_PID $WEB_PID"
echo "   Or run: ./stop.sh"
echo ""

# Save PIDs to file for stop script
echo "$API_PID" > .api.pid
echo "$WEB_PID" > .web.pid

echo "⏳ Waiting for servers to start (10 seconds)..."
sleep 10

echo ""
echo "🎉 Ready! Open http://localhost:3000 in your browser"
