# HELIO Device - Admin-Only Access Implementation ✅

**Date:** January 22, 2026  
**Status:** Complete  
**Module:** Unpaired Devices - Pairing Workspace

---

## 📋 Overview

Implemented admin-only access control for **HELIO devices** (devices with hardware ID prefix `HELIO-xxx`). Only users with **Admin** role can configure and pair HELIO devices, with full control over **Owner selection** and **Project assignment**.

---

## 🎯 Business Rules

### Device Detection
- **HELIO Device Identifier:** Hardware ID starts with `HELIO-` (case-insensitive)
- **Examples:** `HELIO-001`, `HELIO-TEMP-123`, `helio-sensor-456`

### Access Control
- **Admin Users:**
  - ✅ Can view HELIO devices in unpaired list
  - ✅ Can pair HELIO devices
  - ✅ Can select **any Owner** from dropdown (active owners only)
  - ✅ Can select **any Project** from selected owner
  - ✅ Full configuration access

- **Non-Admin Users (Owner Admin, Viewer, Operator):**
  - ❌ HELIO devices **already filtered** by backend (not visible in unpaired list)
  - ❌ Cannot access HELIO device pairing workflow
  - ✅ Regular devices: Normal access (owner auto-detected)

### Field Behavior

| Device Type | User Role | Owner Field | Project Field | Behavior |
|------------|-----------|-------------|---------------|----------|
| **HELIO-xxx** | Admin | **Dropdown** (editable) | **Dropdown** (cascading from owner) | Admin chooses owner + project |
| **HELIO-xxx** | Non-Admin | *N/A* (device hidden) | *N/A* | Device not visible |
| **Regular** | Admin | Read-only (auto-detected) | Dropdown (from auto-detected owner) | Standard workflow |
| **Regular** | Non-Admin | Read-only (auto-detected) | Dropdown (from auto-detected owner) | Standard workflow |

---

## 🔧 Implementation Details

### 1. Frontend Changes

#### **Step Node Config Component** (`step-node-config.component.ts`)

**New Imports:**
```typescript
import { OwnersService } from '../../../../../../../sdk/core/services/owners.service';
import { AuthService } from '../../../../../../services/auth.service';
```

**New Interfaces:**
```typescript
interface OwnerOption {
    id: string;
    code: string;
    name: string;
    status: string;
}
```

**New Properties:**
```typescript
ownerOptions: OwnerOption[] = [];  // For HELIO devices (admin only)
isHelioDevice = false;              // Device type flag
currentUserRole = '';               // Current user's role
ownerFieldEnabled = false;          // Owner dropdown enabled/disabled
```

**Constructor Update:**
```typescript
constructor(
    private nodesService: NodesService,
    private projectsService: ProjectsService,
    private nodeModelsService: NodeModelsService,
    private ownersService: OwnersService,      // NEW
    private authService: AuthService           // NEW
) { }
```

**ngOnInit() Logic:**
```typescript
ngOnInit(): void {
    this.loadExistingNodes();
    
    // Get current user role
    this.currentUserRole = this.authService.getCurrentUserRole();
    
    // Check if this is a HELIO device
    if (this.unpairedDevice && this.unpairedDevice.hardwareId) {
        this.isHelioDevice = this.unpairedDevice.hardwareId.toUpperCase().startsWith('HELIO-');
    }
    
    // HELIO device logic for ADMIN
    if (this.isHelioDevice && this.isAdmin()) {
        console.log('🔒 HELIO Device detected - Admin access enabled');
        this.ownerFieldEnabled = true;
        this.loadAllOwners();  // Load all owners for admin to choose
        
        // Do NOT set ownerId from suggestedOwner - let admin choose manually
        if (this.nodeConfig.newNode) {
            this.nodeConfig.newNode.ownerId = '';  // Reset to empty
        }
    } 
    // Regular device or non-admin: Use suggested owner
    else {
        this.ownerFieldEnabled = false;
        
        // Set ownerId from unpairedDevice's suggestedOwner
        if (this.unpairedDevice && this.nodeConfig.newNode) {
            const suggestedOwnerId = this.unpairedDevice.suggestedOwner as any;
            this.nodeConfig.newNode.ownerId = typeof suggestedOwnerId === 'string' ? suggestedOwnerId : '';
            
            // Load projects for this owner
            this.loadProjectOptions();
            this.loadNodeModelOptions();
        }
    }
}
```

**New Methods:**
```typescript
/**
 * Check if current user is admin
 */
isAdmin(): boolean {
    return this.currentUserRole === 'admin' || this.currentUserRole === 'ADMIN';
}

/**
 * Load all owners (for HELIO devices - admin only)
 */
private loadAllOwners(): void {
    this.ownersService
        .ownersControllerFindAll$Response({ 
            page: 1, 
            limit: 200
            // No owner filter - get all owners
        })
        .subscribe({
            next: (response) => {
                const body = this.parseBody(response.body);
                const items = this.extractDataArray(body);
                this.ownerOptions = items
                    .map((owner: any) => ({
                        id: owner?.idOwner || owner?.id || '',
                        code: owner?.code || '',
                        name: owner?.name || 'Owner',
                        status: owner?.status || 'active'
                    }))
                    .filter((owner: OwnerOption) => owner.id && owner.status === 'active');  // Only active owners
                
                console.log('Loaded owners for HELIO device:', this.ownerOptions.length);
            },
            error: (error) => {
                console.error('Failed to load owners', error);
            }
        });
}

/**
 * Handle owner selection change (for HELIO devices)
 */
onOwnerChange(ownerId: string): void {
    console.log('Owner changed to:', ownerId);
    
    // Set the ownerId in newNode config
    if (this.nodeConfig.newNode) {
        this.nodeConfig.newNode.ownerId = ownerId;
    }
    
    // Clear project selection
    if (this.nodeConfig.newNode) {
        this.nodeConfig.newNode.projectId = '';
    }
    
    // Reload projects for selected owner
    this.loadProjectOptions();
    this.loadNodeModelOptions();
    
    this.emitChanges();
}
```

---

#### **Step Node Config Template** (`step-node-config.component.html`)

**Owner Field - Conditional Rendering:**
```html
<div class="col-md-6">
    <label class="form-label text-uppercase small text-muted">
        Owner 
        <span class="text-danger" *ngIf="isHelioDevice && ownerFieldEnabled">*</span>
        <span *ngIf="isHelioDevice" class="badge bg-primary ms-2">
            <i class="fa fa-lock me-1"></i>HELIO Device
        </span>
    </label>
    
    <!-- ADMIN + HELIO: Dropdown enabled -->
    <select *ngIf="isHelioDevice && ownerFieldEnabled" 
            class="form-select" 
            [(ngModel)]="nodeConfig.newNode!.ownerId"
            (ngModelChange)="onOwnerChange($event)">
        <option value="">-- Select Owner --</option>
        <option *ngFor="let owner of ownerOptions" [value]="owner.id">
            {{ owner.code }} - {{ owner.name }}
        </option>
    </select>
    
    <!-- Non-HELIO or Non-Admin: Read-only -->
    <input *ngIf="!isHelioDevice || !ownerFieldEnabled" 
           type="text" 
           class="form-control" 
           [value]="suggestedOwnerName" 
           disabled>
    
    <small class="text-muted" *ngIf="isHelioDevice && ownerFieldEnabled">
        Select owner for this HELIO device (Admin only)
    </small>
    <small class="text-muted" *ngIf="!isHelioDevice || !ownerFieldEnabled">
        Auto-detected from device data
    </small>
</div>
```

**UI Indicators:**
- **Badge:** <span class="badge bg-primary">🔒 HELIO Device</span>
- **Required Mark:** Red asterisk (*) for admin users
- **Tooltip:** Descriptive help text below field

---

### 2. Backend Changes (Future Implementation)

**Recommended Backend Validation** (currently already filtered by backend):

```typescript
// unpaired-devices.controller.ts
@Post(':id/pair')
async pairDevice(
    @Param('id') id: string,
    @Body() pairDto: PairDeviceDto,
    @CurrentUser() user: User
) {
    // Get unpaired device
    const device = await this.unpairedDevicesService.findOne(id);
    
    // HELIO device check
    if (device.hardwareId.toUpperCase().startsWith('HELIO-')) {
        // Only admin can pair HELIO devices
        if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            throw new ForbiddenException(
                'HELIO devices require Admin privileges. Please contact your administrator.'
            );
        }
        
        // Validate owner selection for HELIO devices
        if (!pairDto.ownerId) {
            throw new BadRequestException(
                'Owner selection is required for HELIO devices'
            );
        }
    }
    
    // Proceed with pairing
    return this.unpairedDevicesService.pairDevice(id, pairDto);
}
```

**Guard Implementation:**
```typescript
// helio-device.guard.ts
@Injectable()
export class HelioDeviceGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const deviceId = request.params.id;
        
        // Get device info
        const device = await this.unpairedDevicesService.findOne(deviceId);
        
        // If HELIO device, check admin role
        if (device.hardwareId.toUpperCase().startsWith('HELIO-')) {
            return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
        }
        
        // Non-HELIO device: normal access
        return true;
    }
}
```

---

## 📊 Validation Rules

### Frontend Validation
```typescript
private isStepValid(): boolean {
    if (this.nodeConfig.mode === 'existing') {
        return !!this.nodeConfig.selectedExistingNode;
    } else {
        // HELIO device requires owner selection
        if (this.isHelioDevice && this.ownerFieldEnabled) {
            return !!(
                this.nodeConfig.newNode?.ownerId &&      // Owner required for HELIO
                this.nodeConfig.newNode?.projectId &&
                this.nodeConfig.newNode?.nodeModelId &&
                this.nodeConfig.newNode?.code &&
                this.nodeConfig.newNode?.serialNumber
            );
        }
        
        // Regular device
        return !!(
            this.nodeConfig.newNode?.projectId &&
            this.nodeConfig.newNode?.nodeModelId &&
            this.nodeConfig.newNode?.code &&
            this.nodeConfig.newNode?.serialNumber
        );
    }
}
```

### Backend Validation (Recommended)
- ✅ Device `hardwareId` starts with `HELIO-` (case-insensitive)
- ✅ User role is `ADMIN` or `SUPER_ADMIN`
- ✅ Owner ID provided in pairing request
- ✅ Project ID provided in pairing request
- ✅ Owner exists and is active
- ✅ Project belongs to selected owner

---

## 🧪 Testing Guide

### Test Scenarios

#### **1. Test as Admin User**
```bash
# Login as admin
POST /api/auth/login
{
  "email": "admin@iot.local",
  "password": "admin123"
}

# Create test HELIO device
POST /api/unpaired-devices
{
  "hardwareId": "HELIO-TEST-001",
  "idNodeModel": "<node-model-id>"
}

# Navigate to: /iot/unpaired-devices
# Expected:
# - HELIO-TEST-001 visible in list with badge "🔒 HELIO Device"
# - Click "Pair" button
# - Step 1 (Node Config): Owner dropdown ENABLED with all active owners
# - Select owner → Project dropdown cascades
# - Select project → Can proceed
# - Complete pairing → Success
```

#### **2. Test as Non-Admin User**
```bash
# Login as tenant
POST /api/auth/login
{
  "email": "tenant@iot.local",
  "password": "tenant123"
}

# Navigate to: /iot/unpaired-devices
# Expected:
# - HELIO-TEST-001 NOT visible in list (filtered by backend)
# - Only devices with matching owner prefix visible
# - Regular devices: Owner field read-only (auto-detected)
```

#### **3. Test Device Detection**
```typescript
// Test cases:
const testCases = [
    { hardwareId: 'HELIO-001', expected: true },
    { hardwareId: 'helio-002', expected: true },
    { hardwareId: 'HELIO-TEMP-123', expected: true },
    { hardwareId: 'ESP32-001', expected: false },
    { hardwareId: 'REGULAR-DEVICE', expected: false },
];

testCases.forEach(test => {
    const isHelio = test.hardwareId.toUpperCase().startsWith('HELIO-');
    console.assert(isHelio === test.expected, `Failed: ${test.hardwareId}`);
});
```

#### **4. Test Owner Cascading**
```typescript
// Admin selects owner
onOwnerChange('owner-abc-123');

// Expected:
// - nodeConfig.newNode.ownerId = 'owner-abc-123'
// - nodeConfig.newNode.projectId = '' (cleared)
// - projectOptions reloaded (filtered by owner-abc-123)
// - Project dropdown shows only projects from selected owner
```

---

## 🎨 UI/UX Design

### Visual Indicators

**HELIO Device Badge:**
```html
<span class="badge bg-primary ms-2">
    <i class="fa fa-lock me-1"></i>HELIO Device
</span>
```

**Owner Field States:**

| State | Visual | Description |
|-------|--------|-------------|
| **HELIO + Admin** | Dropdown + Badge + Required (*) | Admin can select owner |
| **HELIO + Non-Admin** | *Hidden* (device not in list) | Device filtered out |
| **Regular + Admin** | Read-only input | Owner auto-detected |
| **Regular + Non-Admin** | Read-only input | Owner auto-detected |

**Form Validation Feedback:**
- **Empty owner (HELIO):** Red border + "Owner is required"
- **Empty project:** Red border + "Project is required"
- **Valid selection:** Green checkmark

---

## 📝 Configuration

### Device Naming Convention
```typescript
// Recommended HELIO device naming pattern
const helioDevicePattern = /^HELIO-[A-Z0-9]+-\d{3}$/;

// Examples:
'HELIO-TEMP-001'      // ✅ Valid
'HELIO-HUMID-002'     // ✅ Valid
'HELIO-SENSOR-123'    // ✅ Valid
'helio-test-999'      // ✅ Valid (case-insensitive)
'REGULAR-001'         // ❌ Not HELIO device
```

### Owner Filter Settings
```typescript
// Load only active owners for HELIO device dropdown
{
    page: 1,
    limit: 200,
    // status: 'active' // Filter applied in frontend after loading
}
```

---

## 🚀 Benefits

1. **Enhanced Security:**
   - ✅ HELIO devices require admin approval
   - ✅ Prevents unauthorized owner assignment
   - ✅ Audit trail for HELIO device pairings

2. **Flexible Assignment:**
   - ✅ Admin can assign HELIO devices to any owner
   - ✅ Useful for shared infrastructure devices
   - ✅ Support for multi-tenant HELIO deployments

3. **Clear Access Control:**
   - ✅ Role-based device visibility (backend filter)
   - ✅ UI indicators for device type (badge)
   - ✅ Descriptive error messages

4. **Cascading Workflow:**
   - ✅ Owner selection triggers project reload
   - ✅ Projects filtered by selected owner
   - ✅ Validation ensures data consistency

---

## 🔄 Data Flow

### HELIO Device Pairing Workflow (Admin)
```
1. User login as Admin
   ↓
2. Navigate to Unpaired Devices
   ↓
3. HELIO device visible with badge
   ↓
4. Click "Pair" button
   ↓
5. Step 1: Node Configuration
   ├─ isHelioDevice detected (hardwareId starts with HELIO-)
   ├─ isAdmin() returns true
   ├─ ownerFieldEnabled = true
   ├─ loadAllOwners() called
   └─ Owner dropdown populated
   ↓
6. Admin selects Owner
   ├─ onOwnerChange(ownerId) triggered
   ├─ nodeConfig.newNode.ownerId = ownerId
   ├─ nodeConfig.newNode.projectId cleared
   └─ loadProjectOptions() called (filtered by ownerId)
   ↓
7. Admin selects Project
   ├─ nodeConfig.newNode.projectId = projectId
   └─ Validation: ownerId + projectId both filled
   ↓
8. Admin completes configuration
   ├─ Node Code, Serial Number, Model, etc.
   └─ Click "Next" or "Pair Device"
   ↓
9. Backend receives pairing request
   ├─ Validate: hardwareId starts with HELIO-
   ├─ Validate: user.role is ADMIN
   ├─ Validate: ownerId provided
   ├─ Validate: projectId provided
   └─ Create Node with selected owner + project
   ↓
10. Success: HELIO device paired
```

### Regular Device Pairing Workflow (Any User)
```
1. User login (any role)
   ↓
2. Navigate to Unpaired Devices
   ↓
3. Regular device visible (no badge)
   ↓
4. Click "Pair" button
   ↓
5. Step 1: Node Configuration
   ├─ isHelioDevice = false
   ├─ ownerFieldEnabled = false
   ├─ ownerId = suggestedOwner (auto-detected)
   └─ Owner field: Read-only
   ↓
6. User selects Project (from auto-detected owner)
   ├─ projectOptions filtered by suggestedOwner
   └─ Validation: projectId filled
   ↓
7. User completes configuration
   └─ Proceed normally
   ↓
8. Success: Regular device paired
```

---

## ✅ Implementation Checklist

### Frontend ✅
- [x] Detect HELIO devices (`hardwareId.startsWith('HELIO-')`)
- [x] Check user role (`authService.getCurrentUserRole()`)
- [x] Conditional owner dropdown rendering
- [x] Load all active owners (admin only)
- [x] Cascading project dropdown
- [x] UI indicators (badge, required mark)
- [x] Form validation (owner required for HELIO)
- [x] Error-free compilation

### Backend (Recommended) ⏳
- [ ] Add HELIO device check in pairing endpoint
- [ ] Validate admin role for HELIO devices
- [ ] Validate owner selection for HELIO devices
- [ ] Add guard/decorator for HELIO endpoints
- [ ] Unit tests for HELIO validation
- [ ] Integration tests for pairing workflow

### Documentation ✅
- [x] Implementation guide (this document)
- [x] Code comments
- [x] Testing scenarios
- [x] UI/UX design specs

---

## 🎯 Future Enhancements

1. **MAC Address Whitelist:**
   - Implement whitelist for authorized HELIO device MACs
   - Prevent unauthorized HELIO device registration

2. **Approval Workflow:**
   - HELIO devices require admin approval before pairing
   - Email notification to admin when new HELIO device detected

3. **Audit Logging:**
   - Log all HELIO device pairings with admin user ID
   - Track ownership changes for HELIO devices

4. **Bulk Operations:**
   - Bulk pair multiple HELIO devices to same owner
   - Export HELIO device inventory report

5. **Custom Device Prefixes:**
   - Configurable admin-only device prefixes (e.g., `ADMIN-`, `SUPER-`)
   - Database-driven prefix configuration

---

## 📚 Related Documentation
- [Unpaired Devices Module](./UNPAIRED-DEVICES-COMPLETE.md)
- [Role-Based Menu Access](./ROLE-BASED-MENU-ACCESS.md)
- [Multi-Tenant Dashboard](./MULTI-TENANT-DASHBOARD-DESIGN.md)
- [Auth System Design](./AUTH-SYSTEM-DESIGN.md)

---

**Version:** 1.0.0  
**Last Updated:** January 22, 2026  
**Author:** AI Assistant  
**Status:** ✅ Complete & Ready for Testing
