# Test Update Node - id_node_profile

## 📋 Endpoint Info

**Method:** `PATCH`  
**URL:** `http://localhost:3000/nodes/:id`  
**Controller:** `NodesController.update()`  
**Service:** `NodesService.update()`

## ✅ Field `idNodeProfile` Support

Field `idNodeProfile` sudah tersedia di:
- ✅ `CreateNodeDto` (line 24-27)
- ✅ `UpdateNodeDto` (extends PartialType dari CreateNodeDto)
- ✅ `Node` entity (line 63)

---

## 🧪 Test Commands

### Step 1: Check nodes yang ada
```bash
curl -X GET http://localhost:3000/nodes | jq '.'
```

### Step 2: Check node profiles yang ada
```bash
curl -X GET http://localhost:3000/node-profiles | jq '.'
```

### Step 3: Get detail 1 node
```bash
# Ganti <NODE_ID> dengan ID node yang mau di-update
curl -X GET http://localhost:3000/nodes/<NODE_ID> | jq '.'
```

### Step 4: Update node dengan id_node_profile
```bash
# Ganti:
# - <NODE_ID> dengan ID node yang mau di-update
# - <PROFILE_ID> dengan ID profile yang mau di-assign

curl -X PATCH http://localhost:3000/nodes/<NODE_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "idNodeProfile": "<PROFILE_ID>"
  }' | jq '.'
```

### Step 5: Verify update berhasil
```bash
curl -X GET http://localhost:3000/nodes/<NODE_ID> | jq '.idNodeProfile'
```

---

## 🎯 Test Scenarios

### Scenario 1: Assign Profile ke Node
```bash
# Example with real IDs
NODE_ID="your-node-uuid-here"
PROFILE_ID="your-profile-uuid-here"

curl -X PATCH http://localhost:3000/nodes/$NODE_ID \
  -H "Content-Type: application/json" \
  -d "{
    \"idNodeProfile\": \"$PROFILE_ID\"
  }" | jq '.'
```

**Expected Response:**
```json
{
  "idNode": "uuid-here",
  "idProject": "uuid-here",
  "idNodeModel": "uuid-here",
  "code": "NODE-001",
  "idNodeProfile": "your-profile-uuid-here",  // ✅ Updated!
  "serialNumber": "SN12345",
  "devEui": null,
  "ipAddress": null,
  "firmwareVersion": "1.0.0",
  "batteryType": "Li-Ion",
  "telemetryIntervalSec": 300,
  "connectivityStatus": "online",
  "lastSeenAt": "2025-11-20T10:30:00.000Z",
  "idCurrentLocation": null,
  "createdAt": "2025-11-20T08:00:00.000Z",
  "updatedAt": "2025-11-20T10:35:00.000Z"  // ✅ Timestamp updated!
}
```

---

### Scenario 2: Remove Profile dari Node (set null)
```bash
curl -X PATCH http://localhost:3000/nodes/$NODE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "idNodeProfile": null
  }' | jq '.'
```

---

### Scenario 3: Update Profile + Field Lain Sekaligus
```bash
curl -X PATCH http://localhost:3000/nodes/$NODE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "idNodeProfile": "new-profile-uuid",
    "firmwareVersion": "2.0.0",
    "connectivityStatus": "online"
  }' | jq '.'
```

---

## 🔍 Validation Tests

### Test 1: Invalid UUID Format
```bash
curl -X PATCH http://localhost:3000/nodes/$NODE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "idNodeProfile": "not-a-valid-uuid"
  }' | jq '.'
```

**Expected:** HTTP 400 - Validation error

---

### Test 2: Non-existent Node ID
```bash
curl -X PATCH http://localhost:3000/nodes/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -d '{
    "idNodeProfile": "some-uuid"
  }' | jq '.'
```

**Expected:** HTTP 404 - Node not found

---

### Test 3: Check Database
```sql
-- Connect to your database
psql -U postgres -d your_database_name

-- Check node profile assignment
SELECT 
  id_node,
  code,
  id_node_model,
  id_node_profile,
  updated_at
FROM nodes
WHERE id_node = 'your-node-uuid-here';

-- Check with profile details
SELECT 
  n.id_node,
  n.code,
  n.id_node_profile,
  np.name as profile_name,
  np.code as profile_code,
  np.parser_type
FROM nodes n
LEFT JOIN node_profiles np ON n.id_node_profile = np.id_node_profile
WHERE n.id_node = 'your-node-uuid-here';
```

---

## 🚀 Quick Test Script

Simpan ini sebagai `test-update-node.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
NODE_ID="$1"
PROFILE_ID="$2"

if [ -z "$NODE_ID" ] || [ -z "$PROFILE_ID" ]; then
  echo "Usage: ./test-update-node.sh <NODE_ID> <PROFILE_ID>"
  exit 1
fi

echo "🔍 Step 1: Get node before update"
curl -s -X GET $BASE_URL/nodes/$NODE_ID | jq '{idNode, code, idNodeProfile, updatedAt}'

echo ""
echo "🔄 Step 2: Update node with new profile"
curl -s -X PATCH $BASE_URL/nodes/$NODE_ID \
  -H "Content-Type: application/json" \
  -d "{\"idNodeProfile\": \"$PROFILE_ID\"}" | jq '.'

echo ""
echo "✅ Step 3: Verify update"
curl -s -X GET $BASE_URL/nodes/$NODE_ID | jq '{idNode, code, idNodeProfile, updatedAt}'

echo ""
echo "✅ Done!"
```

**Usage:**
```bash
chmod +x test-update-node.sh
./test-update-node.sh <YOUR_NODE_ID> <YOUR_PROFILE_ID>
```

---

## 📊 Code Flow

1. **Request:** `PATCH /nodes/:id` dengan body `{ "idNodeProfile": "uuid" }`
2. **Controller:** `NodesController.update()` menerima request
3. **DTO Validation:** `UpdateNodeDto` validate field `idNodeProfile` (optional UUID)
4. **Service:** `NodesService.update()` 
   - Find node by ID
   - Object.assign() update fields (including `idNodeProfile`)
   - Save to database
5. **Response:** Return updated node dengan `idNodeProfile` baru

---

## ✅ Verification Checklist

- [ ] Field `idNodeProfile` exists in CreateNodeDto ✅
- [ ] Field `idNodeProfile` exists in UpdateNodeDto ✅  
- [ ] Field `idNodeProfile` exists in Node entity ✅
- [ ] Update service handles all fields correctly ✅
- [ ] Test with curl successful
- [ ] Database updated correctly
- [ ] Response contains updated `idNodeProfile`
- [ ] `updatedAt` timestamp changes

---

## 🎉 Result

Endpoint **READY** untuk update `id_node_profile`!

Tinggal jalankan curl command di atas dengan:
1. NODE_ID yang valid
2. PROFILE_ID yang valid (atau null untuk remove)
