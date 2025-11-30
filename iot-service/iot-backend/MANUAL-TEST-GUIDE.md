# Quick Manual Testing Commands

## Prerequisites
```bash
# Make sure server is running
npm run start:dev

# In another terminal, set these variables:
export API_URL="http://localhost:3000/api"
export ADMIN_EMAIL="admin@iot.local"
export ADMIN_PASSWORD="NewPassword123!"
```

## Get Admin Token
```bash
# Login and save token
export ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.access_token')

echo "Token: ${ADMIN_TOKEN:0:50}..."
```

---

## Phase 4: Audit Module Tests

### 1. Get All Audit Logs
```bash
curl -s -X GET "$API_URL/audit?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 2. Get Audit Statistics
```bash
curl -s -X GET "$API_URL/audit/statistics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 3. Filter by Action Type
```bash
# Get login actions
curl -s -X GET "$API_URL/audit?action=login" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Get create actions
curl -s -X GET "$API_URL/audit?action=create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 4. Filter by Entity Type
```bash
curl -s -X GET "$API_URL/audit?entityType=User" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 5. Get User Audit History
```bash
# Get current user ID
export USER_ID=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.user.idUser')

# Get user's audit history
curl -s -X GET "$API_URL/audit/user/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 6. Search Audit Logs
```bash
curl -s -X GET "$API_URL/audit?search=login" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 7. Date Range Filter
```bash
curl -s -X GET "$API_URL/audit?startDate=2025-11-29T00:00:00Z&endDate=2025-11-29T23:59:59Z" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## Phase 5: Notifications Tests

### 1. Create Notification Channel
```bash
curl -s -X POST "$API_URL/notifications/channels" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Notifications",
    "type": "email",
    "description": "Primary email notification channel",
    "config": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false
    },
    "isActive": true
  }' | jq .
```

### 2. Get All Channels
```bash
curl -s -X GET "$API_URL/notifications/channels/all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 3. Get Channel by ID
```bash
# Save channel ID
export CHANNEL_ID=$(curl -s -X GET "$API_URL/notifications/channels/all" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].idChannel')

curl -s -X GET "$API_URL/notifications/channels/$CHANNEL_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 4. Create Notification
```bash
curl -s -X POST "$API_URL/notifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"idUser\": \"$USER_ID\",
    \"idChannel\": \"$CHANNEL_ID\",
    \"type\": \"info\",
    \"title\": \"Test Notification\",
    \"message\": \"This is a test notification from the API\",
    \"metadata\": {
      \"source\": \"manual_test\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }" | jq .
```

### 5. Get All Notifications
```bash
curl -s -X GET "$API_URL/notifications?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 6. Get Unread Count
```bash
curl -s -X GET "$API_URL/notifications/unread-count" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 7. Filter Notifications
```bash
# By type
curl -s -X GET "$API_URL/notifications?type=info" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# By status
curl -s -X GET "$API_URL/notifications?status=sent" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# By read status
curl -s -X GET "$API_URL/notifications?isRead=false" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Search
curl -s -X GET "$API_URL/notifications?search=test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 8. Mark Notification as Read
```bash
# Get first notification ID
export NOTIFICATION_ID=$(curl -s -X GET "$API_URL/notifications?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].idNotification')

# Mark as read
curl -s -X PATCH "$API_URL/notifications/$NOTIFICATION_ID/read" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 9. Mark All as Read
```bash
curl -s -X PATCH "$API_URL/notifications/mark-all-read" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 10. Delete Notification
```bash
curl -s -X DELETE "$API_URL/notifications/$NOTIFICATION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 11. Update Channel
```bash
curl -s -X PATCH "$API_URL/notifications/channels/$CHANNEL_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "isActive": true
  }' | jq .
```

---

## Integration Tests

### Test Audit Logging for Notifications
```bash
# Create a notification
curl -s -X POST "$API_URL/notifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"idUser\": \"$USER_ID\",
    \"idChannel\": \"$CHANNEL_ID\",
    \"type\": \"success\",
    \"title\": \"Integration Test\",
    \"message\": \"Testing audit log integration\"
  }" | jq .

# Wait a moment for audit log to be created
sleep 1

# Check if audit log was created
curl -s -X GET "$API_URL/audit?action=create&search=notification" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### Test User Activity Tracking
```bash
# Perform several actions
curl -s -X POST "$API_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.integration@test.com",
    "password": "Test123!",
    "name": "Integration Test User",
    "role": "tenant"
  }' | jq .

# Check user's audit trail
curl -s -X GET "$API_URL/audit/user/$USER_ID?limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## Automated Test Suite

### Run All Tests
```bash
# From iot-backend directory
./test-auth-system.sh
```

### Run with Output
```bash
./test-auth-system.sh 2>&1 | tee test-results.log
```

---

## Expected Results

### Audit Module
- ✅ All audit logs retrieved
- ✅ Statistics show action counts
- ✅ Filters work correctly
- ✅ User history shows all actions
- ✅ Search finds relevant logs

### Notifications Module
- ✅ Channels can be created/updated/deleted
- ✅ Notifications can be created
- ✅ Notifications are sent asynchronously
- ✅ Read receipts work
- ✅ Unread count is accurate
- ✅ Filters work correctly

### Integration
- ✅ Audit logs created for all actions
- ✅ User activity tracked
- ✅ Notification creation logged
- ✅ Channel changes logged

---

## Troubleshooting

### Issue: 401 Unauthorized
**Solution**: Token expired, get new token:
```bash
export ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.access_token')
```

### Issue: 404 Channel Not Found
**Solution**: Create a channel first:
```bash
curl -s -X POST "$API_URL/notifications/channels" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Channel","type":"in_app","isActive":true}' | jq .
```

### Issue: No Audit Logs
**Solution**: Perform some actions first:
```bash
# Create some activity
curl -s -X GET "$API_URL/users" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
curl -s -X GET "$API_URL/audit" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
```

---

## Quick Test Checklist

### Phase 4 - Audit ✓
- [ ] Get audit logs
- [ ] Get statistics
- [ ] Filter by action
- [ ] Filter by entity
- [ ] Get user history
- [ ] Search logs
- [ ] Date range filter

### Phase 5 - Notifications ✓
- [ ] Create channel
- [ ] List channels
- [ ] Update channel
- [ ] Create notification
- [ ] List notifications
- [ ] Get unread count
- [ ] Mark as read
- [ ] Mark all as read
- [ ] Delete notification
- [ ] Filter notifications

### Integration ✓
- [ ] Audit logs for notifications
- [ ] User activity tracking
- [ ] Notification sending
- [ ] Error handling

---

**Ready to test! Start the server and run the commands above.** 🚀
