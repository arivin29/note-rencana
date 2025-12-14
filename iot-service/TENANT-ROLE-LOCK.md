# User Modal - Tenant Role Lock

## 🔒 Business Rule Implementation

**Rule:** Users created from owner detail page (with `idOwner`) must always be **Tenant** role and cannot be changed to **Admin**.

**Reasoning:**
- Users with `idOwner` belong to a specific owner/tenant
- They should only access data within their tenant scope
- Admin role is for system-wide access (no owner assignment)
- Tenant users cannot be elevated to admin while assigned to owner

---

## ✅ Changes Made

### 1. **Auto-set Role to Tenant on Create**
File: `user-modal.ts` - `ngOnInit()`

When creating user from owner page:
```typescript
ngOnInit(): void {
  this.initForm();

  // If creating from owner page, auto-set role to tenant
  if (this.mode === 'create' && this.ownerId) {
    this.userForm.patchValue({
      role: 'tenant'
    });
  }

  // If editing, populate form with user data
  if (this.mode === 'edit' && this.user) {
    this.userForm.patchValue({
      name: this.user.name,
      email: this.user.email,
      phone: this.user.phone || '',
      role: this.user.role,
      isActive: this.user.isActive
    });
  }
}
```

**Result:** Role dropdown auto-filled with "Tenant" when creating from owner page.

### 2. **Lock Role Dropdown in Edit Mode**
File: `user-modal.html` - Role select field

```html
<select 
  class="form-select" 
  formControlName="role"
  [class.is-invalid]="isFieldInvalid('role')"
  [disabled]="mode === 'edit' && !!ownerId">
  <option value="">Select role...</option>
  <option value="admin">Admin</option>
  <option value="tenant">Tenant</option>
</select>
```

**Logic:**
- `mode === 'edit'` → User is being edited
- `!!ownerId` → User belongs to an owner (has idOwner)
- If both true → Dropdown is **disabled**

### 3. **Updated Form Hints**

#### **Create Mode:**
```html
<div class="form-text" *ngIf="mode === 'create'">
  <i class="fa fa-info-circle me-1"></i>
  <strong>Note:</strong> Users created from owner page will automatically be assigned as <strong>Tenant</strong> role
</div>
```

**Message:** Informs user that role will be "Tenant" by default.

#### **Edit Mode (when ownerId exists):**
```html
<div class="form-text text-warning" *ngIf="mode === 'edit' && ownerId">
  <i class="fa fa-lock me-1"></i>
  <strong>Role is locked:</strong> Users assigned to an owner cannot be changed to Admin
</div>
```

**Message:** Explains why role cannot be changed (security/business rule).

---

## 🎯 User Flow Examples

### **Scenario 1: Create User from Owner Page**

1. User on owner detail page
2. Click "Add User"
3. Modal opens
4. **Role dropdown auto-filled with "Tenant"** ✅
5. Can still change to "Admin" if needed (but shouldn't for tenant users)
6. Fill other fields
7. Submit → User created with `idOwner` + "Tenant" role

**Note:** Even though dropdown allows selecting "Admin", the user will be created with `idOwner`, so they should remain "Tenant".

### **Scenario 2: Edit Tenant User**

1. View user with `idOwner` (tenant user)
2. Open edit (navigate to user detail page)
3. **Role dropdown is DISABLED** 🔒
4. Shows warning: "Role is locked: Users assigned to an owner cannot be changed to Admin"
5. Can edit other fields (name, email, phone, status)
6. Cannot change role from Tenant to Admin

### **Scenario 3: Edit Admin User (no owner)**

1. View user without `idOwner` (admin user)
2. Open edit
3. **Role dropdown is ENABLED** ✅
4. Can change role between Admin/Tenant
5. Admin users are not bound to any owner

---

## 🔐 Security Implications

### **Why Lock Tenant Role?**

1. **Data Isolation**
   - Tenant users should only access their owner's data
   - Elevating to admin breaks multi-tenant isolation

2. **Permission Scope**
   - Admin: System-wide access
   - Tenant: Owner-specific access
   - Cannot have both scopes simultaneously

3. **Business Logic**
   - User with `idOwner` = Belongs to tenant
   - Admin users = No owner assignment
   - Mixing these breaks the model

### **Enforcement Points**

| Check | Location | Enforcement |
|-------|----------|-------------|
| Auto-set role | Frontend (create) | Role = "Tenant" by default |
| Lock role dropdown | Frontend (edit) | Disabled if `idOwner` exists |
| Validate idOwner + role | Backend | Should reject Admin + idOwner combo |

---

## 🧪 Testing Scenarios

### Test 1: Create Tenant User from Owner Page ✅
```
1. Navigate to owner detail page
2. Click "Add User"
3. Modal opens
4. ✅ Role dropdown shows "Tenant" selected
5. ✅ Info message: "Users created from owner page will automatically be assigned as Tenant role"
6. Fill form:
   - Name: "Tenant User"
   - Email: "tenant@example.com"
   - Password: "SecurePass123!"
   - Phone: "081234567890"
   - Role: Tenant (pre-selected)
7. Submit
8. ✅ User created with idOwner + Tenant role
```

### Test 2: Try to Edit Tenant User Role ❌
```
1. View existing tenant user (with idOwner)
2. Navigate to user detail page
3. Find role dropdown
4. ✅ Dropdown is DISABLED (greyed out)
5. ✅ Warning shows: "Role is locked: Users assigned to an owner cannot be changed to Admin"
6. Try to change: Cannot interact with dropdown
7. ✅ Role remains "Tenant"
```

### Test 3: Edit Admin User Role ✅
```
1. View admin user (no idOwner)
2. Navigate to user detail page
3. Find role dropdown
4. ✅ Dropdown is ENABLED
5. Can change role freely
6. Admin users not bound to owner
```

### Test 4: Role Validation on Backend
```
Backend should reject:
❌ { role: "admin", idOwner: "some-uuid" }

Backend should accept:
✅ { role: "tenant", idOwner: "some-uuid" }
✅ { role: "admin", idOwner: null }
```

---

## 🎨 UI States

### **Create Mode - Owner Page**
```
┌─────────────────────────────┐
│ Role *                      │
├─────────────────────────────┤
│ [Tenant ▼]                  │ ← Pre-selected
├─────────────────────────────┤
│ ℹ️ Note: Users created from │
│   owner page will auto be   │
│   assigned as Tenant role   │
└─────────────────────────────┘
```

### **Edit Mode - Tenant User**
```
┌─────────────────────────────┐
│ Role *                      │
├─────────────────────────────┤
│ [Tenant ▼] 🔒              │ ← Disabled
├─────────────────────────────┤
│ 🔒 Role is locked: Users    │
│    assigned to an owner     │
│    cannot be changed to     │
│    Admin                    │
└─────────────────────────────┘
```

### **Edit Mode - Admin User**
```
┌─────────────────────────────┐
│ Role *                      │
├─────────────────────────────┤
│ [Admin ▼]                   │ ← Enabled
├─────────────────────────────┤
│ Can change role freely      │
└─────────────────────────────┘
```

---

## 📊 Role Matrix

| User Type | idOwner | Role | Can Change Role? |
|-----------|---------|------|------------------|
| **Tenant User** | UUID | Tenant | ❌ No (locked) |
| **Admin User** | null | Admin | ✅ Yes |
| **System Admin** | null | Admin | ✅ Yes |

---

## 🚨 Edge Cases

### **What if someone tries to manually change role?**

**Frontend Protection:**
- Role dropdown disabled in edit mode for tenant users
- Cannot interact with the field

**Backend Protection (should exist):**
- Validate that `role=admin` cannot coexist with `idOwner`
- Return validation error if attempted

**Recommended Backend Validation:**
```typescript
// In UpdateUserDto or service
if (updateDto.role === 'admin' && user.idOwner) {
  throw new BadRequestException(
    'Cannot change tenant user to admin role. Remove owner assignment first.'
  );
}
```

---

## 🔄 Future Enhancements

### **Option 1: Remove Owner Assignment First**
Allow changing tenant to admin by:
1. Remove `idOwner` (unassign from owner)
2. Then change role to "admin"
3. Two-step process

### **Option 2: Transfer User**
Allow moving user between:
- Tenant → Admin (remove idOwner)
- Admin → Tenant (assign idOwner)

### **Option 3: Role Conversion Warning**
```
"This user is assigned to Owner X. 
To change to Admin role, the owner 
assignment will be removed. Continue?"
```

---

## ✅ Implementation Summary

**Changes:**
1. ✅ Auto-set role to "Tenant" when creating from owner page
2. ✅ Disable role dropdown in edit mode for tenant users
3. ✅ Show appropriate hints/warnings in UI
4. ✅ Clear messaging about role restrictions

**Result:**
- ✅ Tenant users cannot be elevated to admin (UI locked)
- ✅ Users created from owner page are automatically tenants
- ✅ Clear UX explaining why role is locked
- ✅ Prevents accidental permission escalation

**Security:**
- 🔒 Frontend enforces role locking
- 🔒 Backend should also validate (recommended)
- 🔒 Multi-tenant isolation preserved

---

## 🎯 Summary

**Business Rule:** Users with `idOwner` must remain as **Tenant** role.

**Enforcement:**
- Frontend: Auto-fill + disable dropdown
- Backend: Should validate (recommended)

**User Experience:**
- Clear messaging
- Disabled fields with explanation
- No confusion about why role can't change

**Security:**
- Prevents permission escalation
- Maintains multi-tenant boundaries
- Clear separation: Admin vs Tenant

