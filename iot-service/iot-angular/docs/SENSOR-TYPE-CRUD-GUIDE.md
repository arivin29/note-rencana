# Sensor Type CRUD Implementation Guide

## Overview
Unified drawer component supporting **Create** and **Edit** operations for sensor types with conversion formula support.

## Features Implemented

### 1. **Unified Drawer Component**
File: `sensor-type-drawer.component.ts`

**Supports Two Modes:**
- **Create Mode**: Empty form for adding new sensor types
- **Edit Mode**: Pre-filled form for updating existing sensor types

**Key Inputs:**
```typescript
@Input() isOpen: boolean;           // Controls drawer visibility
@Input() editData: SensorTypeResponseDto | null; // Null = create, Object = edit
```

**Auto-Detection:**
- If `editData` is provided → **Edit Mode**
- If `editData` is null → **Create Mode**

### 2. **Form Fields**

| Field | Create Mode | Edit Mode | Notes |
|-------|-------------|-----------|-------|
| ID | Hidden | Visible (disabled) | Cannot be changed |
| Category | Required | Required | Sensor category name |
| Unit | Required | Required | Default measurement unit |
| Precision | Required | Required | Decimal places |
| Description | Optional | Optional | Not used in current DTO |
| Conversion Formula | Optional | Optional | JavaScript expression |

### 3. **Conversion Formula Features**

**Quick Examples:**
```javascript
// Linear voltage conversion
(x - 0.5) * 2.5           // 0.5-4.5V → 0-10 bar

// Temperature conversion
(x * 9/5) + 32            // Celsius to Fahrenheit

// Percentage
x * 100                   // 0-1 to 0-100%

// Non-linear
Math.sqrt(x)              // Square root for differential pressure
Math.log10(x)             // Logarithmic for pH scales
```

**Validation Rules:**
1. ✅ Must use `x` as the raw value variable
2. ✅ Must return a valid number
3. ❌ Blocks dangerous patterns:
   - `require()`
   - `import()`
   - `eval()`
   - `Function()`
   - `process.`
   - `fs.`
   - `child_process`

**Real-time Validation:**
- Tests formula with sample value (x = 1.0)
- Shows error message if invalid
- Submit button disabled when errors exist

### 4. **Parent Component Integration**

File: `sensor-types.ts`

**State Management:**
```typescript
editingType: SensorTypeResponseDto | null = null;
```

**Methods:**
```typescript
// Open drawer for creating new sensor type
openCreateDrawer() {
  this.editingType = null;
  this.isDrawerOpen = true;
}

// Open drawer for editing existing sensor type
openEditDrawer(type: SensorTypeResponseDto) {
  this.editingType = type;
  this.isDrawerOpen = true;
}

// Handle save - automatically detects create vs edit
handleDrawerSave(formValue: SensorTypeFormValue) {
  if (formValue.id && this.editingType) {
    this.updateSensorType(formValue);  // Edit mode
  } else {
    this.createSensorType(formValue);  // Create mode
  }
}
```

### 5. **UI Components**

**Drawer Header:**
- Create Mode: "New Entry | Add Sensor Type"
- Edit Mode: "Edit Entry | Edit Sensor Type"

**Submit Button:**
- Create Mode: "+ Save Sensor Type"
- Edit Mode: "💾 Update Sensor Type"

**Action Buttons (Table):**
```html
<button class="btn btn-outline-primary" (click)="openEditDrawer(type)">
  <i class="fa fa-edit"></i>
</button>
<button class="btn btn-outline-danger" (click)="deleteSensorType(type.idSensorType)">
  <i class="fa fa-trash"></i>
</button>
```

## API Integration

### Create Sensor Type
**Endpoint:** `POST /api/sensor-types`

**Payload:**
```typescript
{
  category: string;
  defaultUnit?: string;
  precision?: number;
  conversionFormula?: string;
}
```

### Update Sensor Type
**Endpoint:** `PATCH /api/sensor-types/:id`

**Payload:**
```typescript
{
  category?: string;
  defaultUnit?: string;
  precision?: number;
  conversionFormula?: string;
}
```

### Delete Sensor Type
**Endpoint:** `DELETE /api/sensor-types/:id`

**Confirmation:**
- Shows browser confirm dialog before deletion
- Removes from UI immediately on success

## User Flow

### Creating New Sensor Type
1. Click "+ Tambah Sensor Type" button
2. Fill required fields (Category, Unit, Precision)
3. (Optional) Expand "Advanced: Conversion Formula"
4. (Optional) Enter custom formula or click quick example
5. Click "Save Sensor Type"
6. New entry appears at top of list

### Editing Existing Sensor Type
1. Click "Edit" button (pencil icon) on table row
2. Drawer opens with pre-filled data
3. ID field is disabled (cannot be changed)
4. Modify any fields as needed
5. Formula section auto-expands if formula exists
6. Click "Update Sensor Type"
7. Table row updates in place

### Deleting Sensor Type
1. Click "Delete" button (trash icon)
2. Confirm deletion in dialog
3. Entry removed from list

## Advanced Features

### Formula Auto-Expansion
When editing a sensor type that has a conversion formula:
```typescript
this.showAdvanced = !!this.editData.conversionFormula;
```
- Advanced section automatically expands
- User can immediately see and edit the formula

### Error Handling
- **Network errors**: Show alert with error message
- **Validation errors**: Real-time feedback in form
- **Formula errors**: Descriptive error message below textarea

### Loading States
- Spinner shown during API calls
- Buttons disabled during loading
- Form remains interactive

## Testing Checklist

- [ ] Create sensor type without formula
- [ ] Create sensor type with valid formula
- [ ] Create sensor type with invalid formula (should be blocked)
- [ ] Edit sensor type category
- [ ] Edit sensor type formula
- [ ] Remove formula from sensor type (clear field)
- [ ] Add formula to sensor type that didn't have one
- [ ] Delete sensor type with confirmation
- [ ] Cancel delete operation
- [ ] Search/filter includes formula text
- [ ] Formula validation shows correct errors
- [ ] Quick example buttons populate formula correctly

## Code Examples

### Opening Edit Drawer from Code
```typescript
const sensorType = this.sensorTypes.find(t => t.category === 'pressure');
if (sensorType) {
  this.openEditDrawer(sensorType);
}
```

### Programmatic Formula Validation
```typescript
const drawer = this.drawerComponent; // ViewChild reference
const error = drawer.validateFormula();
if (error) {
  console.error('Formula invalid:', error);
}
```

## Best Practices

1. **Always validate formulas** before saving
2. **Show loading indicators** during API calls
3. **Confirm destructive actions** (delete)
4. **Provide helpful error messages** to users
5. **Auto-expand formula section** when editing existing formula
6. **Use quick examples** to guide users
7. **Test formulas with sample values** before deployment

## Related Files

### Frontend
- `sensor-type-drawer.component.ts` - Drawer logic
- `sensor-type-drawer.component.html` - Drawer template
- `sensor-types.ts` - Page component
- `sensor-types.html` - Page template
- `sensor-type-response-dto.ts` - SDK model

### Backend
- `sensor-types.controller.ts` - API endpoints
- `sensor-types.service.ts` - Business logic
- `sensor-type.entity.ts` - Database entity
- `create-sensor-type.dto.ts` - Create DTO
- `update-sensor-type.dto.ts` - Update DTO

### Gateway
- `telemetry-processor.service.ts` - Uses formulas for conversion
- `sensor-type.entity.ts` - Gateway entity

## Troubleshooting

### Formula not being applied
- Check if `conversionFormula` is saved in database
- Verify gateway has loaded latest sensor types
- Check iot-gtw logs for "Applied formula conversion"

### Edit drawer shows empty form
- Verify `editData` input is properly bound
- Check `ngOnChanges` is detecting input changes
- Ensure DTO includes all required fields

### Validation errors not showing
- Check `formulaError` getter is working
- Verify `validateFormula()` method is called
- Ensure error message is bound in template

## Future Enhancements

- [ ] Formula testing tool with live preview
- [ ] Formula history/audit log
- [ ] Formula library/favorites
- [ ] Visual formula builder
- [ ] Role-based permissions for editing formulas
- [ ] Bulk import/export sensor types
- [ ] Formula templates by sensor category
