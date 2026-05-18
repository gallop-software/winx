#!/bin/bash

echo "🔨 Building site..."
npm run build || exit 1

echo ""
echo "🚀 Starting server..."
npm run start &
SERVER_PID=$!

# Give the server a moment to fail if there's an immediate error
sleep 2

# Check if the server process is still running
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
  echo "❌ Server failed to start (process died immediately)"
  echo "💡 Check if port 3000 is already in use or if there are other startup errors"
  exit 1
fi

echo "⏳ Waiting for server to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    echo ""
    break
  fi
  
  # Check if server process died during startup
  if ! ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "❌ Server process died during startup"
    echo "💡 Check if port 3000 is already in use or if there are other startup errors"
    exit 1
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "❌ Server failed to start"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

# Run the crawler
node _scripts/generate-search.mjs

# Kill the server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Done!"
