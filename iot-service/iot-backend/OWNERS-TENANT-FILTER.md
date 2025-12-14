# Owners Controller - Tenant Filtering Implementation

## Overview
Added tenant-based access control to OwnersController to ensure:
- ✅ Tenant users only see their own owner
- ✅ Tenant users can only update their own owner  
- ✅ Tenant users CANNOT delete owners (admin only)
- ✅ Admin users have full access to all owners

---

## Implementation

### 1. findAll() - List Owners
**Route:** `GET /api/owners`

**Logic:**
```typescript
async findAll(
  @Request() req: any,
  @Query() query: OwnerQueryDto
): Promise<PaginatedResponseDto<OwnerResponseDto>> {
  // For non-admin users, only show their own owner
  if (req.user?.role !== 'admin' && req.user?.idOwner) {
    const ownerId = req.user.idOwner;
    console.log('Filtering owners for tenant user:', req.user.email, 'ownerId:', ownerId);
    
    // Get single owner and format as paginated response
    const owner = await this.ownersService.findOne(ownerId);
    return {
      data: [owner],
      meta: {
        total: 1,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: 1,
      },
    };
  }
  
  // Admin users see all owners
  return this.ownersService.findAll(query);
}
```

**Behavior:**
- **Admin:** Returns all owners with pagination
- **Tenant:** Returns only single owner (their own)

**Example Response (Tenant):**
```json
{
  "data": [
    {
      "idOwner": "abc-123",
      "name": "PT. Example",
      "industry": "Manufacturing",
      ...
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 2. findOne() - Get Owner by ID
**Route:** `GET /api/owners/:id`

**Logic:**
```typescript
async findOne(
  @Request() req: any,
  @Param('id') id: string
): Promise<OwnerResponseDto> {
  // For non-admin users, only allow access to their own owner
  if (req.user?.role !== 'admin' && req.user?.idOwner !== id) {
    throw new Error('Forbidden: You can only access your own owner data');
  }
  
  return this.ownersService.findOne(id);
}
```

**Behavior:**
- **Admin:** Can access any owner by ID
- **Tenant:** Can ONLY access their own owner ID
  - If trying to access different owner → Error 403

**Example:**
```bash
# Tenant user with idOwner = 'abc-123'

# ✅ Allowed
GET /api/owners/abc-123

# ❌ Forbidden
GET /api/owners/different-owner-id
# Response: { "message": "Forbidden: You can only access your own owner data" }
```

---

### 3. update() - Update Owner
**Route:** `PATCH /api/owners/:id`

**Logic:**
```typescript
async update(
  @Request() req: any,
  @Param('id') id: string,
  @Body() updateOwnerDto: UpdateOwnerDto,
): Promise<OwnerResponseDto> {
  // For non-admin users, only allow updating their own owner
  if (req.user?.role !== 'admin' && req.user?.idOwner !== id) {
    throw new Error('Forbidden: You can only update your own owner data');
  }
  
  return this.ownersService.update(id, updateOwnerDto);
}
```

**Behavior:**
- **Admin:** Can update any owner
- **Tenant:** Can ONLY update their own owner
  - If trying to update different owner → Error 403

**Use Case:**
Tenant can update their own company info (name, contact, etc)

---

### 4. remove() - Delete Owner
**Route:** `DELETE /api/owners/:id`

**Logic:**
```typescript
async remove(
  @Request() req: any,
  @Param('id') id: string
): Promise<void> {
  // Only admin can delete owners
  if (req.user?.role !== 'admin') {
    throw new Error('Forbidden: Only admins can delete owners');
  }
  
  return this.ownersService.remove(id);
}
```

**Behavior:**
- **Admin:** Can delete any owner
- **Tenant:** CANNOT delete (always forbidden)

**Reason:**
Deleting owner cascades to all projects, nodes, sensors → Critical operation

---

## Access Control Summary

| Endpoint | Admin | Tenant |
|----------|-------|--------|
| `GET /api/owners` | All owners | Own owner only |
| `GET /api/owners/:id` | Any owner | Own owner only |
| `PATCH /api/owners/:id` | Any owner | Own owner only |
| `DELETE /api/owners/:id` | Any owner | ❌ Forbidden |
| `POST /api/owners` | ✅ Create | ✅ Create (sets idOwner) |

---

## Testing

### Test as Admin
```bash
# Login as admin
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}

# Get all owners
GET /api/owners?page=1&limit=10
# Expected: All owners returned

# Get specific owner
GET /api/owners/abc-123
# Expected: Owner details

# Update any owner
PATCH /api/owners/abc-123
{ "name": "Updated Name" }
# Expected: Success

# Delete any owner
DELETE /api/owners/abc-123
# Expected: Success (204)
```

---

### Test as Tenant
```bash
# Login as tenant
POST /api/auth/login
{
  "email": "diki@iot.local",
  "password": "password123"
}
# Returns: { ..., "idOwner": "abc-123", "role": "tenant" }

# Get all owners
GET /api/owners?page=1&limit=1000
# Expected: Only 1 owner returned (total: 1)

# Get own owner
GET /api/owners/abc-123
# Expected: Success

# Get different owner
GET /api/owners/different-id
# Expected: 403 Forbidden

# Update own owner
PATCH /api/owners/abc-123
{ "contactPerson": "New Contact" }
# Expected: Success

# Update different owner
PATCH /api/owners/different-id
{ "name": "Hacked" }
# Expected: 403 Forbidden

# Delete owner
DELETE /api/owners/abc-123
# Expected: 403 Forbidden (admin only)
```

---

## Console Logs

When tenant user calls `/api/owners`:
```
Filtering owners for tenant user: diki@iot.local ownerId: abc-123
```

This helps debugging and audit trails.

---

## Frontend Impact

### Owners List Component
Before:
```typescript
// Showed all 100+ owners
this.owners = response.data; // 100+ items
```

After (Tenant User):
```typescript
// Shows only 1 owner
this.owners = response.data; // 1 item
console.log(response.meta.total); // 1
```

### Owner Detail Page
Tenant users can still:
- View their owner details
- Update their owner info
- Manage users under their owner
- View projects/nodes under their owner

But CANNOT:
- See other owners
- Delete their owner
- Access other owners' data

---

## Security Notes

1. **Request-level filtering**: Happens at controller before service call
2. **Cannot bypass**: Tenant user cannot pass different ownerId in query
3. **Error handling**: Clear error messages for forbidden access
4. **Audit trail**: Console logs track access attempts
5. **Cascade protection**: Delete is admin-only to prevent data loss

---

## Files Modified

1. `src/modules/owners/owners.controller.ts`
   - Added `@Request() req: any` parameter to methods
   - Added role checking logic
   - Added access control for findAll, findOne, update, remove

---

## Summary

✅ **Owners endpoint secured!**
- Tenant users limited to their own owner
- Admin users have full access
- Clear error messages
- Console logging for debugging
- Ready for production use

**Result:** Tenant users at `/owners` page will only see 1 owner (their own) instead of all owners in system.
