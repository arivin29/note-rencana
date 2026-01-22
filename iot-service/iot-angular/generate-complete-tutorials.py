#!/usr/bin/env python3
"""
Generate ALL 84 tutorial components (excluding 2 already done: login, first-login)
Complete generation for the entire tutorial system
"""

import os

BASE_DIR = "/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-angular/src/app/pages/document/tutorials"

# Complete tutorial definitions
# Format: (category_folder, component_name, title, description, category_display, tutorial_id, duration)

ALL_TUTORIALS = [
    # ========== USER GUIDE (9) ==========
    ("user-guide", "dashboard-overview", "Dashboard Overview", "Understanding widgets, KPIs, and navigation", "User Guide", "user-dashboard-overview", 10),
    ("user-guide", "view-projects", "View Projects", "Browse projects and project details", "User Guide", "user-view-projects", 8),
    ("user-guide", "view-owners", "View Owners", "View owner information and contact details", "User Guide", "user-view-owners", 6),
    ("user-guide", "view-nodes", "View Nodes", "Browse connected devices and their status", "User Guide", "user-view-nodes", 8),
    ("user-guide", "view-unpaired-devices", "View Unpaired Devices", "Check devices waiting for pairing", "User Guide", "user-view-unpaired-devices", 6),
    ("user-guide", "view-sensors", "View Sensors", "Monitor sensor readings and status", "User Guide", "user-view-sensors", 8),
    ("user-guide", "view-telemetry", "View Telemetry Data", "Real-time telemetry data and logs", "User Guide", "user-view-telemetry", 10),
    ("user-guide", "view-alerts", "View Alerts", "Active alerts and notifications", "User Guide", "user-view-alerts", 6),
    ("user-guide", "user-profile-settings", "User Profile Settings", "Update profile and change password", "User Guide", "user-profile-settings", 4),
    
    # ========== ADMIN GUIDE (8) ==========
    ("admin-guide", "user-management", "User Management", "Add, edit, and delete users", "Admin Guide", "admin-user-management", 12),
    ("admin-guide", "assign-user-roles", "Assign User Roles", "Role-based access control", "Admin Guide", "admin-assign-roles", 8),
    ("admin-guide", "manage-projects", "Manage Projects", "Create and configure projects", "Admin Guide", "admin-manage-projects", 10),
    ("admin-guide", "node-registration", "Node Registration", "Register new nodes and pairing process", "Admin Guide", "admin-node-registration", 15),
    ("admin-guide", "sensor-configuration", "Sensor Configuration", "Configure sensors, channels, and thresholds", "Admin Guide", "admin-sensor-config", 15),
    ("admin-guide", "alert-rules-setup", "Alert Rules Setup", "Create alert rules and conditions", "Admin Guide", "admin-alert-rules", 12),
    ("admin-guide", "dashboard-customization", "Dashboard Customization", "Create custom dashboards and widgets", "Admin Guide", "admin-dashboard-custom", 10),
    ("admin-guide", "audit-logs", "Audit Logs", "View system logs and user activities", "Admin Guide", "admin-audit-logs", 8),
    
    # ========== OWNER GUIDE (6) ==========
    ("owner-guide", "owner-account-setup", "Owner Account Setup", "Create owner account and company info", "Owner Guide", "owner-account-setup", 10),
    ("owner-guide", "manage-projects", "Manage Projects", "Create and assign projects to teams", "Owner Guide", "owner-manage-projects", 12),
    ("owner-guide", "data-forwarding-setup", "Data Forwarding Setup", "Webhook and database forwarding configuration", "Owner Guide", "owner-data-forwarding", 15),
    ("owner-guide", "sla-contact-settings", "SLA & Contact Settings", "Configure SLA levels and contacts", "Owner Guide", "owner-sla-settings", 8),
    ("owner-guide", "owner-reports", "Owner Reports", "Generate reports and export data", "Owner Guide", "owner-reports", 10),
    ("owner-guide", "multi-project-management", "Multi-Project Management", "Manage multiple projects overview", "Owner Guide", "owner-multi-project", 5),
    
    # ========== MODULE: DASHBOARD (7) ==========
    ("module-dashboard", "kpi-cards", "KPI Cards", "Understanding KPI metrics and indicators", "Module: Dashboard", "module-dashboard-kpi", 5),
    ("module-dashboard", "node-health-widget", "Node Health Widget", "Monitor node status and health", "Module: Dashboard", "module-dashboard-node-health", 5),
    ("module-dashboard", "connectivity-status", "Connectivity Status", "View connectivity statistics", "Module: Dashboard", "module-dashboard-connectivity", 5),
    ("module-dashboard", "telemetry-streams", "Telemetry Streams", "Real-time data streams visualization", "Module: Dashboard", "module-dashboard-telemetry", 5),
    ("module-dashboard", "iot-logs-widget", "IoT Logs Widget", "System logs viewer widget", "Module: Dashboard", "module-dashboard-logs", 5),
    ("module-dashboard", "alert-summary", "Alert Summary", "Recent alerts overview widget", "Module: Dashboard", "module-dashboard-alerts", 5),
    ("module-dashboard", "custom-dashboards", "Custom Dashboards", "Create personalized dashboard views", "Module: Dashboard", "module-dashboard-custom", 5),
    
    # ========== MODULE: OWNERS (5) ==========
    ("module-owners", "owner-list", "Owner List & Overview", "View all owners, search, and filter", "Module: Owners", "module-owners-list", 8),
    ("module-owners", "owner-details", "Owner Details", "View owner information and projects", "Module: Owners", "module-owners-details", 8),
    ("module-owners", "create-owner", "Create New Owner", "Add new owner account", "Module: Owners", "module-owners-create", 8),
    ("module-owners", "edit-owner", "Edit Owner", "Modify owner information and settings", "Module: Owners", "module-owners-edit", 8),
    ("module-owners", "owner-projects", "Owner Projects", "Manage owner's project portfolio", "Module: Owners", "module-owners-projects", 8),
    
    # ========== MODULE: PROJECTS (5) ==========
    ("module-projects", "project-list", "Project List & Overview", "View all projects with filters", "Module: Projects", "module-projects-list", 8),
    ("module-projects", "project-details", "Project Details", "View project info, area type, geofence", "Module: Projects", "module-projects-details", 10),
    ("module-projects", "create-project", "Create New Project", "Add project and configure settings", "Module: Projects", "module-projects-create", 12),
    ("module-projects", "edit-project", "Edit Project", "Modify project settings and status", "Module: Projects", "module-projects-edit", 8),
    ("module-projects", "project-nodes", "Project Nodes", "View and manage project's nodes", "Module: Projects", "module-projects-nodes", 7),
    
    # ========== MODULE: NODES (7) ==========
    ("module-nodes", "node-list-filters", "Node List & Filters", "Browse, search, and filter nodes", "Module: Nodes", "module-nodes-list", 8),
    ("module-nodes", "node-detail-view", "Node Detail View", "View node information and status", "Module: Nodes", "module-nodes-details", 10),
    ("module-nodes", "node-pairing", "Node Pairing", "Pair new devices with QR code scan", "Module: Nodes", "module-nodes-pairing", 12),
    ("module-nodes", "unpaired-devices", "Unpaired Devices", "View and pair unpaired devices", "Module: Nodes", "module-nodes-unpaired", 10),
    ("module-nodes", "node-location-tracking", "Node Location Tracking", "GPS tracking, geofence, and mapping", "Module: Nodes", "module-nodes-location", 8),
    ("module-nodes", "node-profiles", "Node Profiles", "Create and assign node profiles", "Module: Nodes", "module-nodes-profiles", 10),
    ("module-nodes", "node-configuration", "Node Configuration", "Configure node settings", "Module: Nodes", "module-nodes-config", 7),
    
    # ========== MODULE: SENSORS (6) ==========
    ("module-sensors", "sensor-list", "Sensor List", "View all sensors and status", "Module: Sensors", "module-sensors-list", 8),
    ("module-sensors", "sensor-types", "Sensor Types", "Manage sensor types and categories", "Module: Sensors", "module-sensors-types", 8),
    ("module-sensors", "sensor-catalogs", "Sensor Catalogs", "Browse sensor catalogs", "Module: Sensors", "module-sensors-catalogs", 10),
    ("module-sensors", "sensor-channels", "Sensor Channels", "Configure sensor channels", "Module: Sensors", "module-sensors-channels", 10),
    ("module-sensors", "sensor-formulas", "Sensor Formulas", "Create calculation formulas", "Module: Sensors", "module-sensors-formulas", 8),
    ("module-sensors", "sensor-calibration", "Sensor Calibration", "Calibrate sensors", "Module: Sensors", "module-sensors-calibration", 6),
    
    # ========== MODULE: ALERTS (5) ==========
    ("module-alerts", "alert-rules", "Alert Rules", "Create alert conditions and rules", "Module: Alerts", "module-alerts-rules", 12),
    ("module-alerts", "alert-events", "Alert Events", "View triggered alerts", "Module: Alerts", "module-alerts-events", 8),
    ("module-alerts", "alert-notifications", "Alert Notifications", "Email and SMS notifications setup", "Module: Alerts", "module-alerts-notifications", 8),
    ("module-alerts", "alert-acknowledgment", "Alert Acknowledgment", "Acknowledge and resolve alerts", "Module: Alerts", "module-alerts-ack", 6),
    ("module-alerts", "alert-history", "Alert History", "View historical alerts", "Module: Alerts", "module-alerts-history", 6),
    
    # ========== MODULE: REPORTS (4) ==========
    ("module-reports", "generate-reports", "Generate Reports", "Create custom reports", "Module: Reports", "module-reports-generate", 10),
    ("module-reports", "export-data", "Export Data", "Export to CSV, Excel, PDF", "Module: Reports", "module-reports-export", 8),
    ("module-reports", "scheduled-reports", "Scheduled Reports", "Setup automated reports", "Module: Reports", "module-reports-scheduled", 8),
    ("module-reports", "report-templates", "Report Templates", "Use and create templates", "Module: Reports", "module-reports-templates", 4),
    
    # ========== MODULE: USERS (5) ==========
    ("module-users", "add-new-user", "Add New User", "Create user accounts", "Module: Users", "module-users-add", 8),
    ("module-users", "user-roles", "User Roles", "Assign roles and permissions", "Module: Users", "module-users-roles", 10),
    ("module-users", "user-permissions", "User Permissions", "Manage access control", "Module: Users", "module-users-permissions", 8),
    ("module-users", "deactivate-users", "Deactivate Users", "Suspend or remove users", "Module: Users", "module-users-deactivate", 5),
    ("module-users", "user-activity", "User Activity", "Monitor user actions", "Module: Users", "module-users-activity", 4),
    
    # ========== MODULE: PROFILES (3) ==========
    ("module-profiles", "node-profiles", "Node Profiles", "Create node configuration profiles", "Module: Profiles", "module-profiles-node", 10),
    ("module-profiles", "rs485-configuration", "RS485 Configuration", "Configure RS485 sensor profiles", "Module: Profiles", "module-profiles-rs485", 10),
    ("module-profiles", "profile-builder", "Profile Builder", "Use profile builder tool", "Module: Profiles", "module-profiles-builder", 5),
    
    # ========== MODULE: NODE MODELS (3) ==========
    ("module-node-models", "node-models-list", "Node Models List", "View all device models (ESP32, etc)", "Module: Node Models", "module-node-models-list", 6),
    ("module-node-models", "create-node-model", "Create Node Model", "Add new device model type", "Module: Node Models", "module-node-models-create", 8),
    ("module-node-models", "edit-node-model", "Edit Node Model", "Modify model specifications", "Module: Node Models", "module-node-models-edit", 6),
    
    # ========== TROUBLESHOOTING (6) ==========
    ("troubleshooting", "login-issues", "Login Issues", "Can't login, forgot password", "Troubleshooting", "troubleshooting-login", 5),
    ("troubleshooting", "node-offline", "Node Offline", "Troubleshoot offline nodes", "Troubleshooting", "troubleshooting-node-offline", 8),
    ("troubleshooting", "sensor-not-reading", "Sensor Not Reading", "Fix sensor data issues", "Troubleshooting", "troubleshooting-sensor", 8),
    ("troubleshooting", "alert-not-triggering", "Alert Not Triggering", "Debug alert rules", "Troubleshooting", "troubleshooting-alerts", 6),
    ("troubleshooting", "performance-issues", "Performance Issues", "Slow loading, timeout errors", "Troubleshooting", "troubleshooting-performance", 8),
    ("troubleshooting", "data-export-errors", "Data Export Errors", "Fix export problems", "Troubleshooting", "troubleshooting-export", 5),
    
    # ========== FAQ (5) ==========
    ("faq", "general-questions", "General Questions", "Common system questions", "FAQ", "faq-general", 8),
    ("faq", "account-security", "Account & Security", "Password, 2FA, security", "FAQ", "faq-security", 6),
    ("faq", "data-privacy", "Data & Privacy", "Data retention, privacy", "FAQ", "faq-privacy", 6),
    ("faq", "billing-subscription", "Billing & Subscription", "Owner billing questions", "FAQ", "faq-billing", 5),
    ("faq", "technical-specs", "Technical Specs", "System requirements, limits", "FAQ", "faq-technical", 5),
]


def kebab_to_pascal(kebab_str):
    """Convert kebab-case to PascalCase"""
    return ''.join(word.capitalize() for word in kebab_str.split('-'))


def generate_component(category_folder, component_name, title, description, category_display, tutorial_id, duration):
    """Generate a single component with all files"""
    
    class_name = kebab_to_pascal(component_name)
    comp_dir = os.path.join(BASE_DIR, category_folder, component_name)
    os.makedirs(comp_dir, exist_ok=True)
    
    # TypeScript
    ts_content = f'''import {{ Component }} from '@angular/core';
import {{ TutorialBaseComponent }} from '../../../shared/tutorial-base.component';
import {{ TutorialMetadataConfig }} from '../../../shared/tutorial-metadata.interface';

@Component({{
  selector: 'app-{component_name}-tutorial',
  templateUrl: './{component_name}-tutorial.component.html',
  styleUrls: ['./{component_name}-tutorial.component.scss']
}})
export class {class_name}TutorialComponent extends TutorialBaseComponent {{
  
  override metadata: TutorialMetadataConfig = {{
    id: '{tutorial_id}',
    title: '{title}',
    category: '{category_display}',
    difficulty: 'beginner',
    estimatedTime: {duration},
    description: '{description}',
    sections: [
      {{ id: 'introduction', title: 'Introduction', duration: 2 }},
      {{ id: 'getting-started', title: 'Getting Started', duration: 3 }},
      {{ id: 'features', title: 'Key Features', duration: 3 }},
      {{ id: 'next-steps', title: 'Next Steps', duration: 2 }}
    ]
  }};

  constructor() {{
    super();
  }}
}}
'''
    
    # HTML
    html_content = f'''<div class="container">
  <div class="row justify-content-center">
    <div class="col-xl-10">
      
      <!-- Breadcrumb -->
      <ul class="breadcrumb">
        <li class="breadcrumb-item"><a routerLink="/documentation">Documentation</a></li>
        <li class="breadcrumb-item"><a routerLink="/documentation/{category_folder}">{category_display}</a></li>
        <li class="breadcrumb-item active">{title}</li>
      </ul>

      <!-- Page Header -->
      <h1 class="page-header">
        {title} <small>{description}</small>
      </h1>
      <hr class="mb-4">

      <div class="row">
        <!-- Main Content -->
        <div class="col-xl-9">
          
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="d-flex justify-content-between mb-2">
              <span class="text-white-transparent-7">Progress</span>
              <span class="text-white">{{{{ getProgressPercentage() }}}}%</span>
            </div>
            <div class="progress mb-2" style="height: 6px;">
              <div class="progress-bar bg-theme" [style.width.%]="getProgressPercentage()"></div>
            </div>
          </div>

          <!-- Section 1: Introduction -->
          <div id="introduction" class="mb-5">
            <h4><i class="bi bi-info-circle text-theme me-2"></i>Introduction</h4>
            <p class="text-white-transparent-7 mb-3">
              This tutorial will guide you through {description.lower()}
            </p>

            <card>
              <card-body>
                <div class="alert alert-theme mb-0">
                  <div class="d-flex align-items-center">
                    <i class="bi bi-lightbulb fs-3 me-3"></i>
                    <div>
                      <h5 class="mb-1">📝 Coming Soon</h5>
                      <p class="mb-0 opacity-75">
                        This tutorial content is currently being developed. 
                        Check back soon for detailed step-by-step instructions.
                      </p>
                    </div>
                  </div>
                </div>
              </card-body>
            </card>
          </div>

          <!-- Navigation Buttons -->
          <div class="d-flex justify-content-between mt-4">
            <button class="btn btn-outline-theme" (click)="previousSection()" [disabled]="currentSection === 0">
              <i class="bi bi-arrow-left me-2"></i>Previous
            </button>
            <button class="btn btn-theme" (click)="nextSection()" [disabled]="currentSection === metadata.sections.length - 1">
              Next<i class="bi bi-arrow-right ms-2"></i>
            </button>
          </div>

        </div>

        <!-- Sidebar Navigation -->
        <div class="col-xl-3">
          <nav-scroll class="nav">
            <a class="nav-link" 
               *ngFor="let section of metadata.sections; let i = index"
               [class.active]="currentSection === i"
               (click)="goToSection(i)"
               style="cursor: pointer;">
              {{{{ section.title }}}}
            </a>
          </nav-scroll>
        </div>
      </div>

    </div>
  </div>
</div>
'''
    
    # SCSS
    scss_content = "// Using Bootstrap theme - no custom styles needed\n"
    
    # Write files
    with open(os.path.join(comp_dir, f"{component_name}-tutorial.component.ts"), 'w') as f:
        f.write(ts_content)
    with open(os.path.join(comp_dir, f"{component_name}-tutorial.component.html"), 'w') as f:
        f.write(html_content)
    with open(os.path.join(comp_dir, f"{component_name}-tutorial.component.scss"), 'w') as f:
        f.write(scss_content)
    
    return f"{class_name}TutorialComponent"


def main():
    print("🚀 Generating ALL 84 Tutorial Components...\n")
    
    categories = {}
    generated = []
    
    for tutorial in ALL_TUTORIALS:
        category = tutorial[4]
        if category not in categories:
            categories[category] = []
        
        class_name = generate_component(*tutorial)
        categories[category].append(class_name)
        generated.append(class_name)
        print(f"✅ {tutorial[1]} → {class_name}")
    
    print(f"\n" + "="*70)
    print(f"✅ ALL COMPONENTS GENERATED: {len(generated)}/84 components")
    print("="*70)
    
    print("\n📊 Summary by Category:")
    for category, components in sorted(categories.items()):
        print(f"\n{category} ({len(components)} components):")
        for comp in components:
            print(f"  - {comp}")
    
    print(f"\n🎉 Ready for routing and module registration!")


if __name__ == "__main__":
    main()
