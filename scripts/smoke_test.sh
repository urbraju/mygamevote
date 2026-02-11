#!/bin/bash

URL="http://localhost:8081"
echo "Running Smoke Test against $URL..."

# Check if server is reachable
if curl --output /dev/null --silent --head --fail "$URL"; then
  echo "✅ Server is UP and returning 200 OK."
else
  echo "❌ Server is DOWN or returning error."
  exit 1
fi

# Fetch content and check for title
CONTENT=$(curl --silent "$URL")
if echo "$CONTENT" | grep -q "<title>"; then
  echo "✅ Index.html loaded successfully."
else
  echo "⚠️ Index.html content looks suspicious (no title)."
fi

echo "Smoke Test Complete."
