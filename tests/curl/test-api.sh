#!/bin/bash

# Curl API Test Suite
# Tests all API endpoints using curl commands
# Requires: server running on localhost:3001, jq installed

set -e

BASE_URL="http://localhost:3001"
CURL_OPTS="--max-time 10 -s"
PASS=0
FAIL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Kauf Bulb API - Curl Test Suite"
echo "========================================"
echo ""

# Check if server is running
if ! curl $CURL_OPTS "$BASE_URL/api/list" > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Server not running at $BASE_URL${NC}"
  echo "Start the server with: npm run dev"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}ERROR: jq is required but not installed${NC}"
  echo "Install with: brew install jq"
  exit 1
fi

# Test helper function
test_endpoint() {
  local name="$1"
  local expected_status="$2"
  local actual_status="$3"

  if [ "$actual_status" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $name (status: $actual_status)"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $name (expected: $expected_status, got: $actual_status)"
    FAIL=$((FAIL + 1))
  fi
}

# Discover bulbs first
echo -e "${YELLOW}Discovering bulbs...${NC}"
BULBS_JSON=$(curl $CURL_OPTS "$BASE_URL/api/list")
BULB_COUNT=$(echo "$BULBS_JSON" | jq '.bulbs | length')
echo "Found $BULB_COUNT bulb(s)"

if [ "$BULB_COUNT" -eq 0 ]; then
  echo -e "${RED}ERROR: No bulbs found. Cannot run tests.${NC}"
  exit 1
fi

# Get first bulb ID for testing
BULB_ID=$(echo "$BULBS_JSON" | jq -r '.bulbs[0].id')
echo "Using bulb: $BULB_ID"
echo ""

echo "========================================"
echo "Testing API Endpoints"
echo "========================================"
echo ""

# Test 1: List all bulbs
echo "--- List Bulbs ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/list")
test_endpoint "GET /api/list" 200 "$STATUS"

# Test 2: Turn on all bulbs
echo ""
echo "--- Turn On/Off All ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/on")
test_endpoint "GET /api/on (all bulbs)" 200 "$STATUS"
sleep 1

# Test 3: Turn off all bulbs
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/off")
test_endpoint "GET /api/off (all bulbs)" 200 "$STATUS"
sleep 1

# Test 4: Turn on specific bulb
echo ""
echo "--- Turn On/Off Specific Bulb ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/on?device=$BULB_ID")
test_endpoint "GET /api/on?device=$BULB_ID" 200 "$STATUS"
sleep 1

# Test 5: Turn off specific bulb
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/off?device=$BULB_ID")
test_endpoint "GET /api/off?device=$BULB_ID" 200 "$STATUS"
sleep 1

# Test 6: Turn on with transition
echo ""
echo "--- Transitions ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/on?device=$BULB_ID&transition=500")
test_endpoint "GET /api/on with transition=500" 200 "$STATUS"
sleep 2

# Test 7: Refresh discovery
echo ""
echo "--- Discovery ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/refresh")
test_endpoint "POST /api/refresh" 200 "$STATUS"
sleep 2

# Test 8: Get bulb state
echo ""
echo "--- Bulb State ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/bulb/$BULB_ID/state")
test_endpoint "GET /api/bulb/:id/state" 200 "$STATUS"

# Test 9: Get device info
echo ""
echo "--- Device Info ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/bulb/$BULB_ID/info")
test_endpoint "GET /api/bulb/:id/info" 200 "$STATUS"

# Test 10: Test bulb (RGB cycle)
echo ""
echo "--- Test Mode ---"
echo "Running test cycle (this takes ~3 seconds)..."
STATUS=$(curl --max-time 15 -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/bulb/$BULB_ID/test")
test_endpoint "POST /api/bulb/:id/test" 200 "$STATUS"
sleep 2

# Test 11: Advanced control - brightness and color
echo ""
echo "--- Advanced Control ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/bulb/$BULB_ID/control" \
  -H "Content-Type: application/json" \
  -d '{"state": "on", "brightness": 50, "r": 255, "g": 128, "b": 0}')
test_endpoint "POST /api/bulb/:id/control (orange 50%)" 200 "$STATUS"
sleep 1

# Test 12: Advanced control - color with transition
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/bulb/$BULB_ID/control" \
  -H "Content-Type: application/json" \
  -d '{"brightness": 100, "r": 0, "g": 0, "b": 255, "transition": 500}')
test_endpoint "POST /api/bulb/:id/control (blue with transition)" 200 "$STATUS"
sleep 1

# Test 13: Advanced control - turn off with fade
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/bulb/$BULB_ID/control" \
  -H "Content-Type: application/json" \
  -d '{"state": "off", "transition": 500}')
test_endpoint "POST /api/bulb/:id/control (off with fade)" 200 "$STATUS"
sleep 1

# Test 14: Update bulb name (then restore)
echo ""
echo "--- Name Update ---"
# Get original name
ORIGINAL_NAME=$(curl $CURL_OPTS "$BASE_URL/api/list" | jq -r ".bulbs[] | select(.id==\"$BULB_ID\") | .name")

# Update name
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/bulb/$BULB_ID/name" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Bulb Name"}')
test_endpoint "POST /api/bulb/:id/name (update)" 200 "$STATUS"

# Restore original name
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/bulb/$BULB_ID/name" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$ORIGINAL_NAME\"}")
test_endpoint "POST /api/bulb/:id/name (restore)" 200 "$STATUS"

# Test 15: Error cases
echo ""
echo "--- Error Cases ---"
STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/on?device=invalid-bulb-id")
test_endpoint "GET /api/on with invalid device (expect 404)" 404 "$STATUS"

STATUS=$(curl $CURL_OPTS -o /dev/null -w "%{http_code}" "$BASE_URL/api/bulb/invalid-id/state")
test_endpoint "GET /api/bulb/:id/state with invalid id (expect 404)" 404 "$STATUS"

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
