#!/usr/bin/env python3
"""Generate tutorial metadata registry for tutorial.service.ts"""

# Read sitemap to get all tutorial info
tutorials_data = [
    # Getting Started (2 existing - skip these)
    
    # User Guide (9 tutorials)
    {"id": "user-dashboard-overview", "title": "Dashboard Overview", "desc": "Understanding widgets, KPIs, and navigation", "category": "USER_GUIDE", "time": 10, "diff": "beginner", "tags": ["dashboard", "overview", "navigation"], "icon": "bi-speedometer2", "order": 1},
    {"id": "user-view-projects", "title": "View Projects", "desc": "Browse and search projects", "category": "USER_GUIDE", "time": 8, "diff": "beginner", "tags": ["projects", "view", "browse"], "icon": "bi-folder", "order": 2},
    {"id": "user-view-owners", "title": "View Owners", "desc": "Browse owner list and details", "category": "USER_GUIDE", "time": 6, "diff": "beginner", "tags": ["owners", "view"], "icon": "bi-building", "order": 3},
    {"id": "user-view-nodes", "title": "View Nodes", "desc": "Browse node list with filters", "category": "USER_GUIDE", "time": 8, "diff": "beginner", "tags": ["nodes", "view", "filters"], "icon": "bi-diagram-3", "order": 4},
    {"id": "user-view-unpaired-devices", "title": "View Unpaired Devices", "desc": "Find and manage unpaired devices", "category": "USER_GUIDE", "time": 6, "diff": "beginner", "tags": ["devices", "unpaired", "pairing"], "icon": "bi-link-45deg", "order": 5},
    {"id": "user-view-sensors", "title": "View Sensors", "desc": "Browse sensor list and details", "category": "USER_GUIDE", "time": 7, "diff": "beginner", "tags": ["sensors", "view"], "icon": "bi-thermometer", "order": 6},
    {"id": "user-view-telemetry", "title": "View Telemetry", "desc": "Real-time telemetry monitoring", "category": "USER_GUIDE", "time": 10, "diff": "intermediate", "tags": ["telemetry", "real-time", "monitoring"], "icon": "bi-activity", "order": 7},
    {"id": "user-view-alerts", "title": "View Alerts", "desc": "Check and manage active alerts", "category": "USER_GUIDE", "time": 8, "diff": "beginner", "tags": ["alerts", "notifications"], "icon": "bi-bell", "order": 8},
    {"id": "user-profile-settings", "title": "User Profile Settings", "desc": "Update profile, password, preferences", "category": "USER_GUIDE", "time": 5, "diff": "beginner", "tags": ["profile", "settings", "password"], "icon": "bi-person-gear", "order": 9},
    
    # Admin Guide (8 tutorials)
    {"id": "admin-user-management", "title": "User Management", "desc": "Add, edit, deactivate users", "category": "ADMIN_GUIDE", "time": 12, "diff": "intermediate", "tags": ["users", "management"], "icon": "bi-people", "order": 1},
    {"id": "admin-assign-roles", "title": "Assign User Roles", "desc": "Role assignments and permissions", "category": "ADMIN_GUIDE", "time": 8, "diff": "intermediate", "tags": ["roles", "permissions"], "icon": "bi-shield-check", "order": 2},
    {"id": "admin-manage-projects", "title": "Manage Projects", "desc": "Create, edit, delete projects", "category": "ADMIN_GUIDE", "time": 10, "diff": "intermediate", "tags": ["projects", "management"], "icon": "bi-folder-plus", "order": 3},
    {"id": "admin-node-registration", "title": "Node Registration", "desc": "Register and configure new nodes", "category": "ADMIN_GUIDE", "time": 15, "diff": "advanced", "tags": ["nodes", "registration"], "icon": "bi-cpu", "order": 4},
    {"id": "admin-sensor-config", "title": "Sensor Configuration", "desc": "Configure sensor types and formulas", "category": "ADMIN_GUIDE", "time": 12, "diff": "advanced", "tags": ["sensors", "configuration"], "icon": "bi-sliders", "order": 5},
    {"id": "admin-alert-rules", "title": "Alert Rules Setup", "desc": "Create and manage alert rules", "category": "ADMIN_GUIDE", "time": 10, "diff": "intermediate", "tags": ["alerts", "rules"], "icon": "bi-exclamation-triangle", "order": 6},
    {"id": "admin-dashboard-custom", "title": "Dashboard Customization", "desc": "Customize widgets and layouts", "category": "ADMIN_GUIDE", "time": 8, "diff": "intermediate", "tags": ["dashboard", "customization"], "icon": "bi-layout-wtf", "order": 7},
    {"id": "admin-audit-logs", "title": "Audit Logs", "desc": "View and analyze audit logs", "category": "ADMIN_GUIDE", "time": 7, "diff": "intermediate", "tags": ["audit", "logs", "security"], "icon": "bi-file-text", "order": 8},
    
    # Owner Guide (6 tutorials)
    {"id": "owner-account-setup", "title": "Owner Account Setup", "desc": "Initial owner account configuration", "category": "OWNER_GUIDE", "time": 10, "diff": "beginner", "tags": ["owner", "setup"], "icon": "bi-person-badge", "order": 1},
    {"id": "owner-multi-project", "title": "Multi-Project Management", "desc": "Manage multiple projects efficiently", "category": "OWNER_GUIDE", "time": 12, "diff": "intermediate", "tags": ["projects", "management"], "icon": "bi-collection", "order": 2},
    {"id": "owner-data-forwarding", "title": "Data Forwarding Setup", "desc": "Configure data forwarding to external systems", "category": "OWNER_GUIDE", "time": 15, "diff": "advanced", "tags": ["data", "integration"], "icon": "bi-arrow-repeat", "order": 3},
    {"id": "owner-sla-contact", "title": "SLA & Contact Settings", "desc": "Configure SLA and contact preferences", "category": "OWNER_GUIDE", "time": 8, "diff": "intermediate", "tags": ["sla", "contacts"], "icon": "bi-envelope", "order": 4},
    {"id": "owner-reports", "title": "Owner Reports", "desc": "Generate and schedule owner reports", "category": "OWNER_GUIDE", "time": 10, "diff": "intermediate", "tags": ["reports", "analytics"], "icon": "bi-graph-up", "order": 5},
    {"id": "owner-manage-projects", "title": "Manage Projects", "desc": "Create, edit, delete projects", "category": "OWNER_GUIDE", "time": 10, "diff": "intermediate", "tags": ["projects", "management"], "icon": "bi-folder-plus", "order": 6},
]

# Module tutorials
module_tutorials = [
    # Dashboard Module (7)
    {"id": "module-dashboard-kpi", "title": "KPI Cards", "desc": "Monitor key performance indicators", "category": "MODULE_DASHBOARD", "time": 8, "diff": "beginner", "tags": ["kpi", "dashboard"], "icon": "bi-bar-chart", "order": 1},
    {"id": "module-dashboard-health", "title": "Node Health Widget", "desc": "Monitor node health status", "category": "MODULE_DASHBOARD", "time": 6, "diff": "beginner", "tags": ["health", "monitoring"], "icon": "bi-heart-pulse", "order": 2},
    {"id": "module-dashboard-connectivity", "title": "Connectivity Status", "desc": "Real-time connectivity monitoring", "category": "MODULE_DASHBOARD", "time": 7, "diff": "beginner", "tags": ["connectivity", "status"], "icon": "bi-wifi", "order": 3},
    {"id": "module-dashboard-telemetry", "title": "Telemetry Streams", "desc": "Live telemetry data streams", "category": "MODULE_DASHBOARD", "time": 10, "diff": "intermediate", "tags": ["telemetry", "real-time"], "icon": "bi-broadcast", "order": 4},
    {"id": "module-dashboard-logs", "title": "IoT Logs Widget", "desc": "View recent IoT device logs", "category": "MODULE_DASHBOARD", "time": 8, "diff": "beginner", "tags": ["logs", "monitoring"], "icon": "bi-journal-text", "order": 5},
    {"id": "module-dashboard-alerts", "title": "Alert Summary", "desc": "Alert statistics and trends", "category": "MODULE_DASHBOARD", "time": 6, "diff": "beginner", "tags": ["alerts", "summary"], "icon": "bi-exclamation-circle", "order": 6},
    {"id": "module-dashboard-custom", "title": "Custom Dashboards", "desc": "Create and manage custom dashboards", "category": "MODULE_DASHBOARD", "time": 12, "diff": "advanced", "tags": ["dashboard", "customization"], "icon": "bi-grid-3x3", "order": 7},
    
    # Owners Module (5)
    {"id": "module-owners-list", "title": "Owner List", "desc": "Browse and filter owners", "category": "MODULE_OWNERS", "time": 6, "diff": "beginner", "tags": ["owners", "list"], "icon": "bi-list-ul", "order": 1},
    {"id": "module-owners-details", "title": "Owner Details", "desc": "View detailed owner information", "category": "MODULE_OWNERS", "time": 8, "diff": "beginner", "tags": ["owners", "details"], "icon": "bi-info-circle", "order": 2},
    {"id": "module-owners-create", "title": "Create Owner", "desc": "Add new owner to system", "category": "MODULE_OWNERS", "time": 10, "diff": "intermediate", "tags": ["owners", "create"], "icon": "bi-plus-circle", "order": 3},
    {"id": "module-owners-edit", "title": "Edit Owner", "desc": "Modify owner information", "category": "MODULE_OWNERS", "time": 8, "diff": "intermediate", "tags": ["owners", "edit"], "icon": "bi-pencil", "order": 4},
    {"id": "module-owners-projects", "title": "Owner Projects", "desc": "Manage owner's project portfolio", "category": "MODULE_OWNERS", "time": 10, "diff": "intermediate", "tags": ["owners", "projects"], "icon": "bi-folder2-open", "order": 5},
    
    # Projects Module (5)
    {"id": "module-projects-list", "title": "Project List", "desc": "Browse and filter projects", "category": "MODULE_PROJECTS", "time": 6, "diff": "beginner", "tags": ["projects", "list"], "icon": "bi-list-ul", "order": 1},
    {"id": "module-projects-details", "title": "Project Details", "desc": "View detailed project information", "category": "MODULE_PROJECTS", "time": 8, "diff": "beginner", "tags": ["projects", "details"], "icon": "bi-info-circle", "order": 2},
    {"id": "module-projects-create", "title": "Create Project", "desc": "Create new project", "category": "MODULE_PROJECTS", "time": 10, "diff": "intermediate", "tags": ["projects", "create"], "icon": "bi-plus-circle", "order": 3},
    {"id": "module-projects-edit", "title": "Edit Project", "desc": "Modify project settings", "category": "MODULE_PROJECTS", "time": 8, "diff": "intermediate", "tags": ["projects", "edit"], "icon": "bi-pencil", "order": 4},
    {"id": "module-projects-nodes", "title": "Project Nodes", "desc": "View and manage project's nodes", "category": "MODULE_PROJECTS", "time": 10, "diff": "intermediate", "tags": ["projects", "nodes"], "icon": "bi-diagram-3", "order": 5},
    
    # Nodes Module (7)
    {"id": "module-nodes-filters", "title": "Node List Filters", "desc": "Advanced filtering and search", "category": "MODULE_NODES", "time": 8, "diff": "beginner", "tags": ["nodes", "filters"], "icon": "bi-funnel", "order": 1},
    {"id": "module-nodes-detail", "title": "Node Detail View", "desc": "Comprehensive node information", "category": "MODULE_NODES", "time": 10, "diff": "beginner", "tags": ["nodes", "details"], "icon": "bi-info-circle-fill", "order": 2},
    {"id": "module-nodes-pairing", "title": "Node Pairing", "desc": "Pair devices to projects", "category": "MODULE_NODES", "time": 12, "diff": "intermediate", "tags": ["nodes", "pairing"], "icon": "bi-link", "order": 3},
    {"id": "module-nodes-unpaired", "title": "Unpaired Devices", "desc": "Manage unpaired devices", "category": "MODULE_NODES", "time": 8, "diff": "beginner", "tags": ["nodes", "unpaired"], "icon": "bi-unlink", "order": 4},
    {"id": "module-nodes-location", "title": "Node Location Tracking", "desc": "Track and update node locations", "category": "MODULE_NODES", "time": 8, "diff": "intermediate", "tags": ["nodes", "location", "gps"], "icon": "bi-geo-alt", "order": 5},
    {"id": "module-nodes-profiles", "title": "Node Profiles", "desc": "Configure node communication profiles", "category": "MODULE_NODES", "time": 12, "diff": "advanced", "tags": ["nodes", "profiles"], "icon": "bi-file-earmark-code", "order": 6},
    {"id": "module-nodes-config", "title": "Node Configuration", "desc": "Advanced node settings", "category": "MODULE_NODES", "time": 15, "diff": "advanced", "tags": ["nodes", "configuration"], "icon": "bi-gear-fill", "order": 7},
    
    # Sensors Module (6)
    {"id": "module-sensors-list", "title": "Sensor List", "desc": "Browse all sensors", "category": "MODULE_SENSORS", "time": 6, "diff": "beginner", "tags": ["sensors", "list"], "icon": "bi-list-stars", "order": 1},
    {"id": "module-sensors-types", "title": "Sensor Types", "desc": "Understanding sensor types", "category": "MODULE_SENSORS", "time": 8, "diff": "beginner", "tags": ["sensors", "types"], "icon": "bi-tags", "order": 2},
    {"id": "module-sensors-catalogs", "title": "Sensor Catalogs", "desc": "Browse sensor catalog library", "category": "MODULE_SENSORS", "time": 8, "diff": "intermediate", "tags": ["sensors", "catalogs"], "icon": "bi-book", "order": 3},
    {"id": "module-sensors-channels", "title": "Sensor Channels", "desc": "Configure sensor channels", "category": "MODULE_SENSORS", "time": 10, "diff": "advanced", "tags": ["sensors", "channels"], "icon": "bi-collection-play", "order": 4},
    {"id": "module-sensors-formulas", "title": "Sensor Formulas", "desc": "Create and apply sensor formulas", "category": "MODULE_SENSORS", "time": 12, "diff": "advanced", "tags": ["sensors", "formulas"], "icon": "bi-calculator", "order": 5},
    {"id": "module-sensors-calibration", "title": "Sensor Calibration", "desc": "Calibrate sensor readings", "category": "MODULE_SENSORS", "time": 10, "diff": "advanced", "tags": ["sensors", "calibration"], "icon": "bi-sliders2", "order": 6},
    
    # Alerts Module (5)
    {"id": "module-alerts-rules", "title": "Alert Rules", "desc": "Create and manage alert rules", "category": "MODULE_ALERTS", "time": 10, "diff": "intermediate", "tags": ["alerts", "rules"], "icon": "bi-shield-exclamation", "order": 1},
    {"id": "module-alerts-events", "title": "Alert Events", "desc": "View alert event history", "category": "MODULE_ALERTS", "time": 8, "diff": "beginner", "tags": ["alerts", "events"], "icon": "bi-calendar-event", "order": 2},
    {"id": "module-alerts-notifications", "title": "Alert Notifications", "desc": "Configure alert notifications", "category": "MODULE_ALERTS", "time": 10, "diff": "intermediate", "tags": ["alerts", "notifications"], "icon": "bi-envelope-exclamation", "order": 3},
    {"id": "module-alerts-ack", "title": "Alert Acknowledgment", "desc": "Acknowledge and manage alerts", "category": "MODULE_ALERTS", "time": 6, "diff": "beginner", "tags": ["alerts", "acknowledgment"], "icon": "bi-check-circle", "order": 4},
    {"id": "module-alerts-history", "title": "Alert History", "desc": "Browse alert history and trends", "category": "MODULE_ALERTS", "time": 8, "diff": "beginner", "tags": ["alerts", "history"], "icon": "bi-clock-history", "order": 5},
    
    # Reports Module (4)
    {"id": "module-reports-generate", "title": "Generate Reports", "desc": "Create custom reports", "category": "MODULE_REPORTS", "time": 12, "diff": "intermediate", "tags": ["reports", "generate"], "icon": "bi-file-earmark-bar-graph", "order": 1},
    {"id": "module-reports-export", "title": "Export Data", "desc": "Export data to various formats", "category": "MODULE_REPORTS", "time": 8, "diff": "beginner", "tags": ["export", "data"], "icon": "bi-download", "order": 2},
    {"id": "module-reports-scheduled", "title": "Scheduled Reports", "desc": "Automate report generation", "category": "MODULE_REPORTS", "time": 10, "diff": "intermediate", "tags": ["reports", "scheduled"], "icon": "bi-calendar-check", "order": 3},
    {"id": "module-reports-templates", "title": "Report Templates", "desc": "Create and use report templates", "category": "MODULE_REPORTS", "time": 10, "diff": "intermediate", "tags": ["reports", "templates"], "icon": "bi-file-earmark-richtext", "order": 4},
    
    # Users Module (5)
    {"id": "module-users-add", "title": "Add New User", "desc": "Create new user accounts", "category": "MODULE_USERS", "time": 8, "diff": "beginner", "tags": ["users", "create"], "icon": "bi-person-plus", "order": 1},
    {"id": "module-users-roles", "title": "User Roles", "desc": "Manage user roles and permissions", "category": "MODULE_USERS", "time": 10, "diff": "intermediate", "tags": ["users", "roles"], "icon": "bi-person-badge", "order": 2},
    {"id": "module-users-permissions", "title": "User Permissions", "desc": "Configure granular permissions", "category": "MODULE_USERS", "time": 12, "diff": "advanced", "tags": ["users", "permissions"], "icon": "bi-key", "order": 3},
    {"id": "module-users-deactivate", "title": "Deactivate Users", "desc": "Deactivate or suspend users", "category": "MODULE_USERS", "time": 6, "diff": "intermediate", "tags": ["users", "deactivate"], "icon": "bi-person-x", "order": 4},
    {"id": "module-users-activity", "title": "User Activity", "desc": "Monitor user activity logs", "category": "MODULE_USERS", "time": 8, "diff": "intermediate", "tags": ["users", "activity"], "icon": "bi-activity", "order": 5},
    
    # Profiles Module (3)
    {"id": "module-profiles-node", "title": "Node Profiles", "desc": "Configure node profiles", "category": "MODULE_PROFILES", "time": 12, "diff": "advanced", "tags": ["profiles", "nodes"], "icon": "bi-file-code", "order": 1},
    {"id": "module-profiles-rs485", "title": "RS485 Configuration", "desc": "Configure RS485 communication", "category": "MODULE_PROFILES", "time": 15, "diff": "advanced", "tags": ["rs485", "modbus"], "icon": "bi-diagram-2", "order": 2},
    {"id": "module-profiles-builder", "title": "Profile Builder", "desc": "Build custom profiles", "category": "MODULE_PROFILES", "time": 15, "diff": "advanced", "tags": ["profiles", "builder"], "icon": "bi-tools", "order": 3},
    
    # Node Models Module (3)
    {"id": "module-node-models-list", "title": "Node Models List", "desc": "Browse available node models", "category": "MODULE_NODE_MODELS", "time": 6, "diff": "beginner", "tags": ["models", "list"], "icon": "bi-grid-1x2", "order": 1},
    {"id": "module-node-models-create", "title": "Create Node Model", "desc": "Define new node models", "category": "MODULE_NODE_MODELS", "time": 15, "diff": "advanced", "tags": ["models", "create"], "icon": "bi-plus-square", "order": 2},
    {"id": "module-node-models-edit", "title": "Edit Node Model", "desc": "Modify node model definitions", "category": "MODULE_NODE_MODELS", "time": 12, "diff": "advanced", "tags": ["models", "edit"], "icon": "bi-pencil-square", "order": 3},
]

# Troubleshooting (6)
troubleshooting = [
    {"id": "troubleshoot-login", "title": "Login Issues", "desc": "Can't login, forgot password", "category": "TROUBLESHOOTING", "time": 5, "diff": "beginner", "tags": ["login", "password"], "icon": "bi-question-circle", "order": 1},
    {"id": "troubleshoot-node-offline", "title": "Node Offline", "desc": "Troubleshoot offline nodes", "category": "TROUBLESHOOTING", "time": 8, "diff": "intermediate", "tags": ["nodes", "offline"], "icon": "bi-wifi-off", "order": 2},
    {"id": "troubleshoot-sensor", "title": "Sensor Not Reading", "desc": "Fix sensor reading issues", "category": "TROUBLESHOOTING", "time": 10, "diff": "intermediate", "tags": ["sensors", "readings"], "icon": "bi-exclamation-triangle", "order": 3},
    {"id": "troubleshoot-alert", "title": "Alert Not Triggering", "desc": "Debug alert rules", "category": "TROUBLESHOOTING", "time": 8, "diff": "intermediate", "tags": ["alerts", "debug"], "icon": "bi-bell-slash", "order": 4},
    {"id": "troubleshoot-performance", "title": "Performance Issues", "desc": "Slow loading, timeouts", "category": "TROUBLESHOOTING", "time": 10, "diff": "intermediate", "tags": ["performance", "slow"], "icon": "bi-speedometer", "order": 5},
    {"id": "troubleshoot-export", "title": "Data Export Errors", "desc": "Fix export failures", "category": "TROUBLESHOOTING", "time": 6, "diff": "beginner", "tags": ["export", "errors"], "icon": "bi-file-x", "order": 6},
]

# FAQ (5)
faq = [
    {"id": "faq-general", "title": "General Questions", "desc": "Common questions and answers", "category": "FAQ", "time": 5, "diff": "beginner", "tags": ["faq", "general"], "icon": "bi-question-square", "order": 1},
    {"id": "faq-security", "title": "Account Security", "desc": "Security best practices", "category": "FAQ", "time": 6, "diff": "beginner", "tags": ["security", "account"], "icon": "bi-shield-lock", "order": 2},
    {"id": "faq-privacy", "title": "Data Privacy", "desc": "Privacy and data protection", "category": "FAQ", "time": 5, "diff": "beginner", "tags": ["privacy", "data"], "icon": "bi-eye-slash", "order": 3},
    {"id": "faq-billing", "title": "Billing & Subscription", "desc": "Billing and payment questions", "category": "FAQ", "time": 6, "diff": "beginner", "tags": ["billing", "subscription"], "icon": "bi-credit-card", "order": 4},
    {"id": "faq-technical", "title": "Technical Specs", "desc": "System requirements and specs", "category": "FAQ", "time": 8, "diff": "intermediate", "tags": ["technical", "specs"], "icon": "bi-cpu", "order": 5},
]

all_tutorials = tutorials_data + module_tutorials + troubleshooting + faq

# Generate TypeScript metadata
output = []
for t in all_tutorials:
    tags_str = ", ".join([f"'{tag}'" for tag in t['tags']])
    metadata = f"""    {{
      id: '{t['id']}',
      title: '{t['title']}',
      description: '{t['desc']}',
      category: TutorialCategory.{t['category']},
      difficulty: TutorialDifficulty.{t['diff'].upper()},
      estimatedTime: {t['time']},
      roles: [UserRole.USER, UserRole.ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN],
      tags: [{tags_str}],
      order: {t['order']},
      icon: '{t['icon']}',
    }},"""
    output.append(metadata)

print("\n".join(output))
print(f"\n// Total: {len(all_tutorials)} tutorials")
