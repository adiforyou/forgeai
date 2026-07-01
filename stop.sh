#!/bin/bash

# PR Reviewer Pro - Stop Script

echo "🛑 Stopping PR Reviewer Pro..."
echo ""

# Read PIDs from files
if [ -f .api.pid ]; then
    API_PID=$(cat .api.pid)
    echo "Stopping Backend (PID: $API_PID)..."
    kill $API_PID 2>/dev/null && echo "✅ Backend stopped" || echo "⚠️  Backend not running"
    rm .api.pid
else
    echo "⚠️  No backend PID file found"
fi

if [ -f .web.pid ]; then
    WEB_PID=$(cat .web.pid)
    echo "Stopping Frontend (PID: $WEB_PID)..."
    kill $WEB_PID 2>/dev/null && echo "✅ Frontend stopped" || echo "⚠️  Frontend not running"
    rm .web.pid
else
    echo "⚠️  No frontend PID file found"
fi

echo ""
echo "Docker containers are still running. To stop them:"
echo "   docker-compose down"
echo ""
echo "✅ Stopped!"
