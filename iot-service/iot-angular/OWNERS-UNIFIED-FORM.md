# Owners Unified Form Implementation

## Overview
Form owners sekarang menggunakan **unified component pattern** - satu component (`OwnersAddPage`) untuk both CREATE dan EDIT mode.

## Implementation Summary

### 1. Component Logic (`owners-add.ts`)
- **Added Properties:**
  - `ownerId`: string | null - ID owner dari route params
  - `isEditMode`: boolean - Flag untuk detect mode (edit vs create)
  - `loadingData`: boolean - State saat load data untuk edit
  
- **Added Methods:**
  - `loadOwner(id)` - Load existing owner data untuk edit mode
  - `createOwner()` - Handle create operation (original logic)
  - `updateOwner()` - Handle update operation (new)
  - `pageTitle`, `breadcrumbTitle`, `submitButtonText` - Dynamic UI helpers

### 2. Route Detection
```typescript
ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    this.ownerId = params.get('ownerId');
    this.isEditMode = !!this.ownerId;
    
    if (this.isEditMode && this.ownerId) {
      this.loadOwner(this.ownerId);
    }
  });
}
```

### 3. Form Submission Logic
```typescript
submitOwner() {
  if (this.ownerForm.invalid) {
    this.ownerForm.markAllAsTouched();
    return;
  }

  if (this.isEditMode && this.ownerId) {
    this.updateOwner(formValue, forwarding);
  } else {
    this.createOwner(formValue, forwarding);
  }
}
```

### 4. SDK Methods Used
- **Create:** `ownersService.ownersControllerCreate({ body: CreateOwnerDto })`
- **Update:** `ownersService.ownersControllerUpdate$Response({ id, body: UpdateOwnerDto })`
- **Load:** `ownersService.ownersControllerFindOne$Response({ id })`

### 5. DTO Differences
**CreateOwnerDto:**
- Required: `name`, `industry`, `contactPerson`, `slaLevel`, `forwardingSettings`
- Optional: `email`, `phone`, `address`, `notes` (accessed via index signature)

**UpdateOwnerDto:**
- All fields optional: `name`, `industry`, `contactPerson`, `slaLevel`, `forwardingSettings`
- Note: `email`, `phone`, `address`, `notes` not in UpdateOwnerDto (backend handles separately)

### 6. Routing Configuration
```typescript
const routes: Routes = [
  { path: '', component: OwnersListPage },
  { path: 'new', component: OwnersAddPage },           // CREATE
  { path: ':ownerId/edit', component: OwnersAddPage }, // EDIT (same component)
  { path: ':ownerId', component: OwnersDetailPage }
];
```

### 7. HTML Changes
- **Dynamic Title:** `{{ pageTitle }}` - Shows "Create Owner" or "Edit Owner"
- **Dynamic Breadcrumb:** `{{ breadcrumbTitle }}` - Shows "Create" or "Edit"
- **Loading State:** Shows spinner when `loadingData === true`
- **Dynamic Button:** `{{ submitButtonText }}` - Shows "Save Owner" or "Update Owner"

### 8. Edit Button in Detail Page
Already exists in `owners-detail.html`:
```html
<a [routerLink]="['/iot/owners', ownerId, 'edit']" class="btn btn-outline-theme">
  <i class="fa fa-pen fa-fw me-1"></i>
  Edit Owner
</a>
```

## Navigation Flow

### Create Flow:
1. User clicks "Add Owner" → Navigate to `/iot/owners/new`
2. Form loads with empty fields
3. User fills form → Submit
4. API call: `POST /api/owners`
5. Success: Navigate to `/iot/owners?created={id}`

### Edit Flow:
1. User views owner detail → Click "Edit Owner" button
2. Navigate to `/iot/owners/{ownerId}/edit`
3. Component detects `ownerId` in route params → `isEditMode = true`
4. Load existing data: `GET /api/owners/{id}`
5. Form populated with existing values
6. User modifies form → Submit
7. API call: `PATCH /api/owners/{id}`
8. Success: Navigate to `/iot/owners/{id}`

## Key Patterns Applied

✅ **Single Responsibility:** One component handles both create and edit
✅ **Route-Based Mode Detection:** Use route params to determine mode
✅ **Separate Methods:** `createOwner()` and `updateOwner()` for clarity
✅ **Loading States:** Show spinner while fetching data
✅ **Dynamic UI:** Titles and buttons adapt to current mode
✅ **SDK Integration:** Proper use of `$Response()` methods with JSON parsing
✅ **Index Signature Access:** Use bracket notation for optional DTO properties

## Files Modified
- `src/app/pages/iot/owners/owners-add/owners-add.ts` - Added edit mode support
- `src/app/pages/iot/owners/owners-add/owners-add.html` - Added dynamic UI elements
- `src/app/pages/iot/owners/owners-routing.module.ts` - Changed edit route to use OwnersAddPage
- `src/app/pages/iot/owners/owners.module.ts` - Removed OwnersEditPage declaration

## Status
✅ **Complete** - Owners form fully supports both create and edit modes
✅ **Tested** - No compilation errors
✅ **Pattern Established** - Ready to replicate for Nodes and Sensors modules
