#!/bin/bash

# PR Reviewer Pro - API Test Script
# This script tests all implemented API endpoints

BASE_URL="http://localhost:8080/api"
EMAIL="test@example.com"
NAME="Test User"

echo "🚀 Testing PR Reviewer Pro APIs"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local auth=$5

    echo -n "Testing: $name... "

    if [ "$auth" == "true" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    if echo "$response" | grep -q "error"; then
        echo -e "${RED}FAILED${NC}"
        echo "Response: $response"
        FAILED=$((FAILED + 1))
    else
        echo -e "${GREEN}PASSED${NC}"
        PASSED=$((PASSED + 1))
    fi
}

# 1. Health Check
echo "📋 Step 1: Health Check"
test_endpoint "Health Check" "GET" "/health" "" "false"
echo ""

# 2. Sign Up
echo "📋 Step 2: Authentication"
signup_response=$(curl -s -X POST "$BASE_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"name\":\"$NAME\"}")

TOKEN=$(echo $signup_response | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}FAILED: Could not get token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Signup successful${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 3. Test Auth Endpoints
test_endpoint "Get Current User" "GET" "/auth/me" "" "true"
echo ""

# 4. Test Settings Endpoints
echo "📋 Step 3: Settings"
test_endpoint "Get Settings" "GET" "/settings" "" "true"
test_endpoint "Update Settings" "PUT" "/settings" '{"defaultModel":"gpt-4o","autoReview":true}' "true"
test_endpoint "Test API Key" "POST" "/settings/test-key" '{"provider":"openai"}' "true"
echo ""

# 5. Test Repository Endpoints
echo "📋 Step 4: Repositories"
test_endpoint "List Repositories" "GET" "/repositories" "" "true"
test_endpoint "Add Repository" "POST" "/repositories" '{"platform":"github","repoFullName":"facebook/react"}' "true"
test_endpoint "List Repositories Again" "GET" "/repositories" "" "true"
echo ""

# 6. Test Pull Request Endpoints
echo "📋 Step 5: Pull Requests"
test_endpoint "List Pull Requests" "GET" "/pull-requests" "" "true"
echo ""

# 7. Test Review Endpoints
echo "📋 Step 6: Reviews"
test_endpoint "List Reviews" "GET" "/reviews" "" "true"
echo ""

# 8. Test Analytics Endpoints
echo "📋 Step 7: Analytics"
test_endpoint "Dashboard Stats" "GET" "/analytics/dashboard" "" "true"
test_endpoint "Cost Analytics" "GET" "/analytics/costs" "" "true"
test_endpoint "Trends Analytics" "GET" "/analytics/trends" "" "true"
echo ""

# Summary
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
