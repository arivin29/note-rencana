#!/bin/bash

# Generate all 84 tutorial components (excluding 2 already done)
BASE_DIR="/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-angular"
TUTORIALS_DIR="$BASE_DIR/src/app/pages/document/tutorials"
SCRIPT="$BASE_DIR/generate-component.sh"

cd "$TUTORIALS_DIR"

echo "🚀 Generating User Guide tutorials (9)..."
bash "$SCRIPT" user-guide/dashboard-overview dashboard-overview "Dashboard Overview" "Understanding widgets, KPIs, and navigation"
bash "$SCRIPT" user-guide/view-projects view-projects "View Projects" "Browse projects and project details"
bash "$SCRIPT" user-guide/view-owners view-owners "View Owners" "View owner information and contact details"
bash "$SCRIPT" user-guide/view-nodes view-nodes "View Nodes" "Browse connected devices and their status"
bash "$SCRIPT" user-guide/view-unpaired-devices view-unpaired-devices "View Unpaired Devices" "Check devices waiting for pairing"
bash "$SCRIPT" user-guide/view-sensors view-sensors "View Sensors" "Monitor sensor readings and status"
bash "$SCRIPT" user-guide/view-telemetry view-telemetry "View Telemetry Data" "Real-time telemetry data and logs"
bash "$SCRIPT" user-guide/view-alerts view-alerts "View Alerts" "Active alerts and notifications"
bash "$SCRIPT" user-guide/user-profile-settings user-profile-settings "User Profile Settings" "Update profile and change password"

echo "🚀 Generating Admin Guide tutorials (8)..."
bash "$SCRIPT" admin-guide/user-management user-management "User Management" "Add, edit, and delete users"
bash "$SCRIPT" admin-guide/assign-user-roles assign-user-roles "Assign User Roles" "Role-based access control"
bash "$SCRIPT" admin-guide/manage-projects manage-projects "Manage Projects" "Create and configure projects"
bash "$SCRIPT" admin-guide/node-registration node-registration "Node Registration" "Register new nodes and pairing process"
bash "$SCRIPT" admin-guide/sensor-configuration sensor-configuration "Sensor Configuration" "Configure sensors, channels, and thresholds"
bash "$SCRIPT" admin-guide/alert-rules-setup alert-rules-setup "Alert Rules Setup" "Create alert rules and conditions"
bash "$SCRIPT" admin-guide/dashboard-customization dashboard-customization "Dashboard Customization" "Create custom dashboards and widgets"
bash "$SCRIPT" admin-guide/audit-logs audit-logs "Audit Logs" "View system logs and user activities"

echo "🚀 Generating Owner Guide tutorials (6)..."
bash "$SCRIPT" owner-guide/owner-account-setup owner-account-setup "Owner Account Setup" "Create owner account and company info"
bash "$SCRIPT" owner-guide/manage-projects manage-projects "Manage Projects" "Create and assign projects to teams"
bash "$SCRIPT" owner-guide/data-forwarding-setup data-forwarding-setup "Data Forwarding Setup" "Webhook and database forwarding configuration"
bash "$SCRIPT" owner-guide/sla-contact-settings sla-contact-settings "SLA & Contact Settings" "Configure SLA levels and contacts"
bash "$SCRIPT" owner-guide/owner-reports owner-reports "Owner Reports" "Generate reports and export data"
bash "$SCRIPT" owner-guide/multi-project-management multi-project-management "Multi-Project Management" "Manage multiple projects overview"

echo "✅ Phase 1 complete: User Guides (23 components)"
echo "📊 Progress: 23/84 tutorials generated"
