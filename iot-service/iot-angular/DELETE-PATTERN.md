# Delete Pattern: Confirm & Redirect ✅

## Pattern Overview
> "Delete dengan konfirmasi, lalu redirect ke parent route setelah sukses."

---

## Implementation

### 1. **UI: Delete Button**
**File**: `sensor-chanel-detail.html`

```html
<button class="btn btn-outline-danger btn-sm" (click)="deleteChannel()">
    <i class="fa fa-trash fa-fw me-1"></i>
    Delete Channel
</button>
```

**Placement**: Header actions, setelah Edit button

### 2. **TypeScript: Delete Method**
**File**: `sensor-chanel-detail.ts`

```typescript
/**
 * Delete channel and redirect to node detail
 */
deleteChannel() {
  if (!this.channelId) {
    alert('Channel ID not found');
    return;
  }

  // ✅ Step 1: Confirm deletion
  const confirmDelete = confirm(
    `Are you sure you want to delete channel "${this.sensorName}"?\n\n` +
    `This will permanently remove:\n` +
    `- Channel configuration\n` +
    `- All telemetry data\n` +
    `- Alert rules\n\n` +
    `This action cannot be undone.`
  );

  if (!confirmDelete) {
    return; // User cancelled
  }

  // ✅ Step 2: Show loading state
  this.loading = true;

  // ✅ Step 3: Call delete API
  this.sensorChannelsService.sensorChannelsControllerRemove({ 
    id: this.channelId 
  }).subscribe({
    next: () => {
      console.log('Channel deleted successfully');
      this.loading = false;
      
      // ✅ Step 4: Redirect to parent route
      this.router.navigate(['/iot/nodes', this.nodeId]);
    },
    error: (err) => {
      console.error('Error deleting channel:', err);
      this.loading = false;
      alert('Failed to delete channel. Please try again.');
    }
  });
}
```

### 3. **Dependencies**
```typescript
import { Router } from '@angular/router';

constructor(
  private route: ActivatedRoute,
  private router: Router, // ✅ Add Router
  private sensorChannelsService: SensorChannelsService
) { }
```

---

## Pattern Rules

### ✅ **DO**

1. **Always Confirm**
   - Show clear confirmation dialog
   - Explain what will be deleted
   - Warn that action is permanent

2. **Show Loading State**
   - Set `this.loading = true` before API call
   - Disable buttons during deletion
   - Set `this.loading = false` in both success & error

3. **Use Router for Navigation**
   - `this.router.navigate(['/path'])` ✅
   - NOT `window.location.href` ❌
   - Preserves Angular routing state

4. **Redirect to Parent**
   - Detail page → List page
   - Child resource → Parent resource
   - Clear and predictable navigation

5. **Handle Errors**
   - Show user-friendly error message
   - Log error to console
   - Reset loading state

### ❌ **DON'T**

1. **Never delete without confirmation**
   - Users make mistakes
   - Data loss is permanent

2. **Never redirect before API completes**
   - Wait for success response
   - Handle errors before redirect

3. **Never use window.location.href**
   - Breaks Angular routing
   - Loses application state
   - Forces full page reload

4. **Never leave orphaned data**
   - Backend should handle cascade deletes
   - Clean up related records

---

## Flow Diagram

```
User clicks "Delete Channel"
   ↓
Show confirmation dialog
   ├─ User clicks "Cancel"
   │    └─ Return (do nothing)
   │
   └─ User clicks "OK"
        ↓
   Set loading = true
        ↓
   DELETE /api/sensor-channels/:id
        ↓
        ├─ Success
        │    ├─ Log success
        │    ├─ Set loading = false
        │    └─ router.navigate(['/iot/nodes/:nodeId'])
        │              ↓
        │         Node Detail Page (parent)
        │              ↓
        │         List refreshed (channel removed)
        │
        └─ Error
             ├─ Log error
             ├─ Set loading = false
             └─ Show alert("Failed to delete")
                  ↓
             User stays on detail page (retry possible)
```

---

## Confirmation Dialog

### Good Confirmation Message ✅
```typescript
const confirmDelete = confirm(
  `Are you sure you want to delete channel "${this.sensorName}"?\n\n` +
  `This will permanently remove:\n` +
  `- Channel configuration\n` +
  `- All telemetry data\n` +
  `- Alert rules\n\n` +
  `This action cannot be undone.`
);
```

**Why Good:**
- Shows resource name (helps user verify)
- Lists what will be deleted (clear consequences)
- Warns about permanence (no undo)
- Clear and specific

### Bad Confirmation Message ❌
```typescript
const confirmDelete = confirm('Delete?'); // ❌ Too vague
const confirmDelete = confirm('Are you sure?'); // ❌ Not specific
```

---

## Navigation Pattern

### Route Structure
```
/iot/nodes/:nodeId              ← Parent (list of sensors/channels)
  └─ /iot/nodes/:nodeId/sensor/:sensorId  ← Child (detail)
```

### Delete Navigation
```typescript
// Current route: /iot/nodes/NODE-123/sensor/CHANNEL-456
this.nodeId = 'NODE-123';  // From route params
this.channelId = 'CHANNEL-456';  // From route params

// After delete, navigate to:
this.router.navigate(['/iot/nodes', this.nodeId]);
// Result: /iot/nodes/NODE-123
```

### Benefits
- ✅ User returns to context (node detail)
- ✅ Parent list auto-refreshes (in ngOnInit)
- ✅ Deleted resource no longer accessible
- ✅ Clear user flow

---

## Backend DELETE Endpoint

### Expected Behavior
```http
DELETE /api/sensor-channels/:id
```

**Success Response** (200 OK):
```json
// Empty or confirmation message
```

**Cascade Deletes** (Backend Should Handle):
- Related sensor_logs
- Related alert_events
- Related dashboard_widgets
- Any other foreign key references

**Error Responses**:
- `404 Not Found` - Channel doesn't exist
- `400 Bad Request` - Invalid UUID
- `500 Server Error` - Database error

---

## Loading State UI

### Disable Buttons During Delete
```html
<button 
  class="btn btn-outline-danger btn-sm" 
  (click)="deleteChannel()"
  [disabled]="loading">
  <i class="fa fa-trash fa-fw me-1"></i>
  <span *ngIf="!loading">Delete Channel</span>
  <span *ngIf="loading">
    <i class="fa fa-spinner fa-spin"></i>
    Deleting...
  </span>
</button>
```

### Show Loading Overlay (Optional)
```html
<div *ngIf="loading" class="loading-overlay">
  <div class="spinner-border text-danger" role="status">
    <span class="visually-hidden">Deleting...</span>
  </div>
  <p class="mt-2">Deleting channel...</p>
</div>
```

---

## Testing Checklist

### Happy Path
- [ ] Click delete button
- [ ] Confirmation dialog appears
- [ ] Click OK
- [ ] Loading state shows
- [ ] API DELETE request sent
- [ ] Success response received
- [ ] Redirect to parent route
- [ ] Parent list no longer shows deleted item

### Error Path
- [ ] Click delete button
- [ ] Confirmation dialog appears
- [ ] Click Cancel → Nothing happens ✅
- [ ] Click OK with network error
- [ ] Error message shows
- [ ] User stays on detail page
- [ ] Can retry delete

### Edge Cases
- [ ] Delete non-existent resource (404)
- [ ] Delete without permission (403)
- [ ] Network timeout
- [ ] Backend error (500)
- [ ] Channel ID missing/invalid

---

## Apply to Other Resources

### Delete Sensor
```typescript
// In sensor-detail page
deleteSensor() {
  const confirm = confirm(`Delete sensor "${this.sensorName}"?`);
  if (!confirm) return;
  
  this.loading = true;
  this.sensorsService.sensorsControllerRemove({ id: this.sensorId }).subscribe({
    next: () => {
      this.loading = false;
      // Redirect to node detail (parent)
      this.router.navigate(['/iot/nodes', this.nodeId]);
    },
    error: (err) => {
      this.loading = false;
      alert('Failed to delete sensor');
    }
  });
}
```

### Delete Node
```typescript
// In node-detail page
deleteNode() {
  const confirm = confirm(`Delete node "${this.nodeCode}"?`);
  if (!confirm) return;
  
  this.loading = true;
  this.nodesService.nodesControllerRemove({ id: this.nodeId }).subscribe({
    next: () => {
      this.loading = false;
      // Redirect to nodes list (parent)
      this.router.navigate(['/iot/nodes']);
    },
    error: (err) => {
      this.loading = false;
      alert('Failed to delete node');
    }
  });
}
```

---

## Security Considerations

### Backend Validation
```typescript
// Backend should verify:
1. User has permission to delete
2. Resource exists
3. Resource belongs to user's scope
4. No critical dependencies (or handle cascade)
```

### Frontend Protection
```typescript
// Optional: Check if resource is deletable
if (this.channel.hasActiveAlerts) {
  alert('Cannot delete channel with active alerts. Disable alerts first.');
  return;
}
```

---

## Summary

### Pattern Steps
1. ✅ User clicks delete button
2. ✅ Show confirmation dialog with details
3. ✅ User confirms (or cancels)
4. ✅ Set loading state
5. ✅ Call DELETE API
6. ✅ Handle success → Redirect to parent
7. ✅ Handle error → Show message, stay on page

### Key Benefits
- ✅ Clear user intent (confirmation)
- ✅ Prevents accidental deletes
- ✅ Predictable navigation (back to parent)
- ✅ Consistent pattern across app
- ✅ Good UX (loading states, error handling)

---

**Status**: ✅ COMPLETE  
**Pattern**: Confirm & Redirect  
**Applied To**: sensor-chanel-detail (Delete Channel)  
**Next**: Apply to sensor-detail, node-detail
