# Relay Control Component - Frontend Implementation

Complete implementation of relay control UI in Angular application.

---

## ✅ Implementation Complete

**Date:** November 22, 2025  
**Status:** ✅ Ready for Testing  
**Framework:** Angular 13+

---

## 📦 What Was Built

### 1. Component Files

**Created:**
- ✅ `node-relay-control.component.ts` - Component logic & API integration
- ✅ `node-relay-control.component.html` - UI template
- ✅ `node-relay-control.component.scss` - Styling & animations
- ✅ Registered in `nodes.module.ts`
- ✅ Integrated in `nodes-detail.html`

---

## 🎨 Features

### Core Functionality
- ✅ **Relay ON/OFF Control** - Toggle relay states
- ✅ **PULSE Action** - Temporary activation with auto-off
- ✅ **Configurable Duration** - Adjust pulse duration (1-60 seconds)
- ✅ **MQTT Status Indicator** - Real-time connection status
- ✅ **Command History** - Last 10 commands with timestamps
- ✅ **LocalStorage Persistence** - History saved per device
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Loading States** - Visual feedback during operations
- ✅ **Confirmation Dialogs** - Prevent accidental commands

### UI/UX
- ✅ **Bootstrap 5 Integration** - Consistent with existing design
- ✅ **Responsive Design** - Works on mobile & desktop
- ✅ **Color-Coded States** - Visual relay state indication
  - 🟢 Green = ON
  - ⚫ Gray = OFF
  - ⚪ Light = Unknown
- ✅ **Smooth Animations** - Transitions & hover effects
- ✅ **Toast Notifications** - Success/error messages
- ✅ **Bootstrap Icons** - Consistent iconography

---

## 📂 File Structure

```
iot-angular/src/app/pages/iot/nodes/nodes-detail/
└── node-relay-control/
    ├── node-relay-control.component.ts      # Component logic
    ├── node-relay-control.component.html    # UI template
    └── node-relay-control.component.scss    # Styles
```

---

## 🔌 API Integration

### SDK Service Used
```typescript
import { DeviceCommandsService } from '../../../../../../sdk/core/services/device-commands.service';
import { SendRelayCommandDto } from '../../../../../../sdk/core/models/send-relay-command-dto';
import { CommandResponseDto } from '../../../../../../sdk/core/models/command-response-dto';
```

### Methods Called
```typescript
// Check MQTT connection status
deviceCommandsService.deviceCommandsControllerGetMqttStatus$Response()

// Send relay command
deviceCommandsService.deviceCommandsControllerSendRelayCommand$Response({
  body: {
    deviceId: string,
    action: 'on' | 'off' | 'pulse',
    target: 'out1' | 'out2',
    duration?: number
  }
})
```

---

## 📊 Component Interface

### Inputs
```typescript
@Input() deviceId: string;   // Required - Device MAC address
@Input() nodeCode: string;   // Required - Node code for display
```

### Usage in Template
```html
<app-node-relay-control 
    [deviceId]="nodeId" 
    [nodeCode]="nodeId">
</app-node-relay-control>
```

---

## 🎯 User Flow

### 1. Check MQTT Status
```
Component Init
    ↓
Check MQTT Status (GET /api/device-commands/status)
    ↓
Display Connection Badge (Green/Red)
    ↓
Enable/Disable Buttons
```

### 2. Send Command
```
User Clicks Button (ON/OFF/PULSE)
    ↓
Show Confirmation Dialog
    ↓
User Confirms
    ↓
Show Loading Overlay
    ↓
Send API Request (POST /api/device-commands/relay)
    ↓
Update Relay State (Optimistic)
    ↓
Add to History
    ↓
Show Success Notification
    ↓
Save History to LocalStorage
```

### 3. Handle Errors
```
API Request Fails
    ↓
Add Error to History
    ↓
Show Error Notification
    ↓
Keep Previous Relay State
```

---

## 🎨 UI Components

### Relay Cards
Each relay has its own card with:
- **State Badge** - Current state (ON/OFF/UNKNOWN)
- **Icon** - Visual indicator
- **Description** - Common use case
- **Control Buttons** - ON / OFF / PULSE
- **Color Coding** - Green (ON), Gray (OFF), Light (Unknown)

### Pulse Duration Setting
- Input field with spinner (1-60 seconds)
- Unit display (seconds)
- Affects PULSE command behavior

### Command History Table
Columns:
- **Time** - Timestamp
- **Target** - OUT1 or OUT2
- **Action** - ON, OFF, or PULSE
- **Status** - Success (green) / Failed (red)
- **Message** - Result message

Features:
- Last 10 commands
- Sortable by time (newest first)
- Clear history button
- Persisted to localStorage

---

## 💾 LocalStorage

### Storage Key
```typescript
`relay_history_${deviceId}`
```

### Data Structure
```json
[
  {
    "timestamp": "2025-11-22T12:00:00.000Z",
    "target": "out1",
    "action": "on",
    "success": true,
    "message": "Command sent successfully"
  }
]
```

### Methods
```typescript
loadCommandHistory()   // Load from localStorage on init
saveCommandHistory()   // Save after each command
clearHistory()        // Clear all history
```

---

## 🎨 Styling Features

### Color Scheme
```scss
// Relay ON
background: linear-gradient(135deg, #28a745 0%, #20c997 100%);

// Relay OFF
background: linear-gradient(135deg, #6c757d 0%, #495057 100%);

// Unknown State
background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
border: 2px dashed #dee2e6;

// Primary Header
background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
```

### Animations
```scss
// Slide In (notifications)
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

// Slide Out
@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

// Button Hover
&:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
```

### Responsive Design
```scss
@media (max-width: 768px) {
  .relay-card {
    min-height: 180px;
    padding: 1rem;
    
    .btn {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }
  }
}
```

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Component loads without errors
- [ ] MQTT status displays correctly
- [ ] Buttons are enabled when MQTT connected
- [ ] Buttons are disabled when MQTT disconnected
- [ ] ON command updates relay state to green
- [ ] OFF command updates relay state to gray
- [ ] PULSE command shows ON briefly, then OFF
- [ ] Pulse duration can be adjusted (1-60 seconds)
- [ ] Confirmation dialogs appear before commands
- [ ] Success notifications appear after commands
- [ ] Error notifications appear on failures
- [ ] Command history populates correctly
- [ ] History persists after page reload
- [ ] Clear history button works
- [ ] Loading overlay appears during API calls
- [ ] Responsive design works on mobile
- [ ] Component integrates smoothly in node detail page

### Integration Testing
- [ ] SDK service imports correctly
- [ ] API calls execute successfully
- [ ] MQTT status reflects backend state
- [ ] Command responses match backend format
- [ ] Error handling works for network failures
- [ ] LocalStorage operations work cross-browser

---

## 🐛 Error Handling

### Network Errors
```typescript
error: (err) => {
  console.error('Failed to send relay command:', err);
  this.addToHistory({
    success: false,
    message: err.error?.message || 'Failed to send command'
  });
  this.showNotification('error', `Failed: ${err.error?.message}`);
}
```

### MQTT Disconnected
```typescript
if (!this.mqttConnected) {
  alert('MQTT is not connected. Please check backend connection.');
  return;
}
```

### Missing Device ID
```typescript
if (!this.deviceId) {
  alert('Device ID is not available');
  return;
}
```

---

## 📱 Mobile Responsiveness

### Breakpoints
- **Desktop (≥768px):** Full layout with 2 columns
- **Mobile (<768px):** Stacked layout, smaller buttons

### Mobile Optimizations
- Reduced padding on relay cards
- Smaller button font sizes
- Stacked relay cards
- Full-width pulse duration input
- Smaller table font size

---

## 🔄 State Management

### Relay State
```typescript
interface RelayState {
  out1: 'on' | 'off' | 'unknown';
  out2: 'on' | 'off' | 'unknown';
}
```

### Optimistic Updates
```typescript
// Update state immediately (before API confirmation)
if (action === 'on') {
  this.relayState[target] = 'on';
} else if (action === 'off') {
  this.relayState[target] = 'off';
}
```

### PULSE Behavior
```typescript
// ON briefly, then auto OFF
this.relayState[target] = 'on';
setTimeout(() => {
  this.relayState[target] = 'off';
}, this.pulseDuration * 1000);
```

---

## 📚 Integration with Node Detail Page

### Location
Added to sidebar (right column) in Node Detail page, between:
- Device Specifications (above)
- Maintenance Timeline (below)

### Props Passed
```html
<app-node-relay-control 
    [deviceId]="nodeId"    <!-- MAC address or hardware ID -->
    [nodeCode]="nodeId">   <!-- Display name -->
</app-node-relay-control>
```

### Data Flow
```
NodesDetailPage
    ↓ [deviceId, nodeCode]
NodeRelayControlComponent
    ↓ HTTP Requests
DeviceCommandsService (SDK)
    ↓ REST API
iot-backend
    ↓ MQTT Publish
MQTT Broker
    ↓ MQTT Subscribe
ESP32 Device
```

---

## 🎯 Next Steps

### Backend Integration
1. ✅ Backend API ready
2. ✅ MQTT integration working
3. ⏳ Test with real ESP32 device

### Firmware Implementation
1. ⏳ Implement MQTT command subscription
2. ⏳ Parse relay commands
3. ⏳ Execute digitalWrite
4. ⏳ Send acknowledgment

### Future Enhancements
- [ ] Real-time relay state sync (WebSocket)
- [ ] Scheduled commands (cron-like)
- [ ] Relay usage analytics
- [ ] Historical relay logs from database
- [ ] Bulk relay commands (all devices)
- [ ] Relay automation rules

---

## 📖 Documentation References

- [Backend API Docs](../../../../iot-backend/docs/DEVICE-COMMANDS-API.md)
- [Integration Guide](../../../../iot-backend/INTEGRATION-GUIDE.md)
- [Quick Reference](../../../../iot-backend/DEVICE-COMMANDS-QUICK-REF.md)

---

**Implementation Date:** November 22, 2025  
**Status:** ✅ Ready for Testing  
**Next Phase:** End-to-End Testing with Real Device
