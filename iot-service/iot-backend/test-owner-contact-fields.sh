#!/bin/bash

# Test Owner Contact Fields
# Quick test script for new email, phone, address fields

BASE_URL="http://localhost:3000/api/owners"

echo "=========================================="
echo "Testing Owner Contact Fields"
echo "=========================================="
echo ""

# Test 1: Create owner with contact fields
echo "Test 1: Creating owner with contact fields..."
RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company Ltd",
    "industry": "Technology",
    "contactPerson": "Jane Smith",
    "email": "jane.smith@testcompany.com",
    "phone": "+628123456789",
    "address": "Jl. Teknologi No. 456, Bandung",
    "slaLevel": "Gold"
  }')

OWNER_ID=$(echo "$RESPONSE" | jq -r '.idOwner')

if [ "$OWNER_ID" != "null" ] && [ -n "$OWNER_ID" ]; then
  echo "✅ Owner created successfully!"
  echo "   ID: $OWNER_ID"
  echo "   Email: $(echo "$RESPONSE" | jq -r '.email')"
  echo "   Phone: $(echo "$RESPONSE" | jq -r '.phone')"
  echo "   Address: $(echo "$RESPONSE" | jq -r '.address')"
else
  echo "❌ Failed to create owner"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo ""
echo "=========================================="

# Test 2: Get owner and verify fields
echo "Test 2: Retrieving owner and verifying fields..."
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/$OWNER_ID")

EMAIL=$(echo "$GET_RESPONSE" | jq -r '.email')
PHONE=$(echo "$GET_RESPONSE" | jq -r '.phone')
ADDRESS=$(echo "$GET_RESPONSE" | jq -r '.address')

if [ "$EMAIL" = "jane.smith@testcompany.com" ] && \
   [ "$PHONE" = "+628123456789" ] && \
   [ "$ADDRESS" = "Jl. Teknologi No. 456, Bandung" ]; then
  echo "✅ All fields retrieved correctly!"
  echo "   Email: $EMAIL"
  echo "   Phone: $PHONE"
  echo "   Address: $ADDRESS"
else
  echo "❌ Field mismatch!"
  echo "$GET_RESPONSE" | jq .
  exit 1
fi

echo ""
echo "=========================================="

# Test 3: Update owner contact fields
echo "Test 3: Updating contact fields..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/$OWNER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "updated@testcompany.com",
    "phone": "+628987654321",
    "address": "New Address, Jakarta"
  }')

UPDATED_EMAIL=$(echo "$UPDATE_RESPONSE" | jq -r '.email')
UPDATED_PHONE=$(echo "$UPDATE_RESPONSE" | jq -r '.phone')
UPDATED_ADDRESS=$(echo "$UPDATE_RESPONSE" | jq -r '.address')

if [ "$UPDATED_EMAIL" = "updated@testcompany.com" ] && \
   [ "$UPDATED_PHONE" = "+628987654321" ] && \
   [ "$UPDATED_ADDRESS" = "New Address, Jakarta" ]; then
  echo "✅ Contact fields updated successfully!"
  echo "   New Email: $UPDATED_EMAIL"
  echo "   New Phone: $UPDATED_PHONE"
  echo "   New Address: $UPDATED_ADDRESS"
else
  echo "❌ Update failed!"
  echo "$UPDATE_RESPONSE" | jq .
  exit 1
fi

echo ""
echo "=========================================="

# Test 4: Create owner without contact fields (backward compatibility)
echo "Test 4: Testing backward compatibility (without contact fields)..."
COMPAT_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Legacy Company",
    "industry": "Manufacturing"
  }')

COMPAT_ID=$(echo "$COMPAT_RESPONSE" | jq -r '.idOwner')

if [ "$COMPAT_ID" != "null" ] && [ -n "$COMPAT_ID" ]; then
  echo "✅ Backward compatibility maintained!"
  echo "   Owner created without contact fields"
  echo "   ID: $COMPAT_ID"
else
  echo "❌ Backward compatibility broken!"
  echo "$COMPAT_RESPONSE" | jq .
  exit 1
fi

echo ""
echo "=========================================="

# Test 5: Invalid email validation
echo "Test 5: Testing email validation..."
INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Email Test",
    "industry": "Testing",
    "email": "invalid-email"
  }')

ERROR_MSG=$(echo "$INVALID_RESPONSE" | jq -r '.message')

if [[ "$ERROR_MSG" == *"email"* ]]; then
  echo "✅ Email validation working correctly!"
  echo "   Error: $ERROR_MSG"
else
  echo "❌ Email validation not working!"
  echo "$INVALID_RESPONSE" | jq .
fi

echo ""
echo "=========================================="
echo "✅ All tests completed successfully!"
echo "=========================================="
echo ""
echo "Test owners created:"
echo "  - Owner 1: $OWNER_ID"
echo "  - Owner 2: $COMPAT_ID"
echo ""
echo "To clean up test data, run:"
echo "  curl -X DELETE $BASE_URL/$OWNER_ID"
echo "  curl -X DELETE $BASE_URL/$COMPAT_ID"
echo ""
