#!/bin/bash
echo "Starting BK FOOD + AI Server..."

# Start Flask AI server in background
cd bkfood_ai
pip install -r requirements.txt -q

# Try different Python commands
if command -v python &> /dev/null; then
    python 5_api_server.py &
elif command -v python3 &> /dev/null; then
    python3 5_api_server.py &
else
    echo "ERROR: Python not found. Please install Python and try again."
    exit 1
fi

FLASK_PID=$!
echo "✅ Flask AI server started (PID: $FLASK_PID) on port 5001"

# Go back to root and start Next.js
cd ..
echo "✅ Starting Next.js..."
npm run dev

# When Next.js stops, kill Flask too
kill $FLASK_PID
