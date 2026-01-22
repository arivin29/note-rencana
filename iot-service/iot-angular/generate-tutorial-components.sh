#!/bin/bash

# Script to generate all tutorial component placeholders
# Run from iot-angular directory

cd src/app/pages/document/tutorials

echo "🚀 Creating User Guide tutorials..."
mkdir -p user-guide/{dashboard-overview,view-projects,view-owners,view-nodes,view-unpaired-devices,view-sensors,view-telemetry,view-alerts,user-profile-settings}

echo "🚀 Creating Admin Guide tutorials..."
mkdir -p admin-guide/{user-management,assign-user-roles,manage-projects,node-registration,sensor-configuration,alert-rules-setup,dashboard-customization,audit-logs}

echo "🚀 Creating Owner Guide tutorials..."
mkdir -p owner-guide/{owner-account-setup,manage-projects,data-forwarding-setup,sla-contact-settings,owner-reports,multi-project-management}

echo "🚀 Creating Module: Dashboard tutorials..."
mkdir -p module-dashboard/{kpi-cards,node-health-widget,connectivity-status,telemetry-streams,iot-logs-widget,alert-summary,custom-dashboards}

echo "🚀 Creating Module: Owners tutorials..."
mkdir -p module-owners/{owner-list,owner-details,create-owner,edit-owner,owner-projects}

echo "🚀 Creating Module: Projects tutorials..."
mkdir -p module-projects/{project-list,project-details,create-project,edit-project,project-nodes}

echo "🚀 Creating Module: Nodes tutorials..."
mkdir -p module-nodes/{node-list-filters,node-detail-view,node-pairing,unpaired-devices,node-location-tracking,node-profiles,node-configuration}

echo "🚀 Creating Module: Sensors tutorials..."
mkdir -p module-sensors/{sensor-list,sensor-types,sensor-catalogs,sensor-channels,sensor-formulas,sensor-calibration}

echo "🚀 Creating Module: Alerts tutorials..."
mkdir -p module-alerts/{alert-rules,alert-events,alert-notifications,alert-acknowledgment,alert-history}

echo "🚀 Creating Module: Reports tutorials..."
mkdir -p module-reports/{generate-reports,export-data,scheduled-reports,report-templates}

echo "🚀 Creating Module: Users tutorials..."
mkdir -p module-users/{add-new-user,user-roles,user-permissions,deactivate-users,user-activity}

echo "🚀 Creating Module: Profiles tutorials..."
mkdir -p module-profiles/{node-profiles,rs485-configuration,profile-builder}

echo "🚀 Creating Module: Node Models tutorials..."
mkdir -p module-node-models/{node-models-list,create-node-model,edit-node-model}

echo "🚀 Creating Troubleshooting tutorials..."
mkdir -p troubleshooting/{login-issues,node-offline,sensor-not-reading,alert-not-triggering,performance-issues,data-export-errors}

echo "🚀 Creating FAQ tutorials..."
mkdir -p faq/{general-questions,account-security,data-privacy,billing-subscription,technical-specs}

echo "✅ All tutorial folders created!"
echo "📁 Total: 86 tutorial folders"

tree -L 2 .
