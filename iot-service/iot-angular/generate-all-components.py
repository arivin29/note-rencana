#!/usr/bin/env python3
"""
Generate all 84 tutorial components with correct naming
"""

import os
import re

BASE_DIR = "/Users/arivin29macmini/Documents/DEVETEK/pra-project/iot-service/iot-angular/src/app/pages/document/tutorials"

# Tutorial definitions: (category_folder, component_name, title, description, category_display, tutorial_id, duration)
TUTORIALS = [
    # User Guide (9)
    ("user-guide", "dashboard-overview", "Dashboard Overview", "Understanding widgets, KPIs, and navigation", "User Guide", "user-dashboard-overview", 10),
    ("user-guide", "view-projects", "View Projects", "Browse projects and project details", "User Guide", "user-view-projects", 8),
    ("user-guide", "view-owners", "View Owners", "View owner information and contact details", "User Guide", "user-view-owners", 6),
    ("user-guide", "view-nodes", "View Nodes", "Browse connected devices and their status", "User Guide", "user-view-nodes", 8),
    ("user-guide", "view-unpaired-devices", "View Unpaired Devices", "Check devices waiting for pairing", "User Guide", "user-view-unpaired-devices", 6),
    ("user-guide", "view-sensors", "View Sensors", "Monitor sensor readings and status", "User Guide", "user-view-sensors", 8),
    ("user-guide", "view-telemetry", "View Telemetry Data", "Real-time telemetry data and logs", "User Guide", "user-view-telemetry", 10),
    ("user-guide", "view-alerts", "View Alerts", "Active alerts and notifications", "User Guide", "user-view-alerts", 6),
    ("user-guide", "user-profile-settings", "User Profile Settings", "Update profile and change password", "User Guide", "user-profile-settings", 4),
    
    # Admin Guide (8)
    ("admin-guide", "user-management", "User Management", "Add, edit, and delete users", "Admin Guide", "admin-user-management", 12),
    ("admin-guide", "assign-user-roles", "Assign User Roles", "Role-based access control", "Admin Guide", "admin-assign-roles", 8),
    ("admin-guide", "manage-projects", "Manage Projects", "Create and configure projects", "Admin Guide", "admin-manage-projects", 10),
    ("admin-guide", "node-registration", "Node Registration", "Register new nodes and pairing process", "Admin Guide", "admin-node-registration", 15),
    ("admin-guide", "sensor-configuration", "Sensor Configuration", "Configure sensors, channels, and thresholds", "Admin Guide", "admin-sensor-config", 15),
    ("admin-guide", "alert-rules-setup", "Alert Rules Setup", "Create alert rules and conditions", "Admin Guide", "admin-alert-rules", 12),
    ("admin-guide", "dashboard-customization", "Dashboard Customization", "Create custom dashboards and widgets", "Admin Guide", "admin-dashboard-custom", 10),
    ("admin-guide", "audit-logs", "Audit Logs", "View system logs and user activities", "Admin Guide", "admin-audit-logs", 8),
    
    # Owner Guide (6)
    ("owner-guide", "owner-account-setup", "Owner Account Setup", "Create owner account and company info", "Owner Guide", "owner-account-setup", 10),
    ("owner-guide", "manage-projects", "Manage Projects", "Create and assign projects to teams", "Owner Guide", "owner-manage-projects", 12),
    ("owner-guide", "data-forwarding-setup", "Data Forwarding Setup", "Webhook and database forwarding configuration", "Owner Guide", "owner-data-forwarding", 15),
    ("owner-guide", "sla-contact-settings", "SLA & Contact Settings", "Configure SLA levels and contacts", "Owner Guide", "owner-sla-settings", 8),
    ("owner-guide", "owner-reports", "Owner Reports", "Generate reports and export data", "Owner Guide", "owner-reports", 10),
    ("owner-guide", "multi-project-management", "Multi-Project Management", "Manage multiple projects overview", "Owner Guide", "owner-multi-project", 5),
]


def kebab_to_pascal(kebab_str):
    """Convert kebab-case to PascalCase"""
    return ''.join(word.capitalize() for word in kebab_str.split('-'))


def generate_component(category_folder, component_name, title, description, category_display, tutorial_id, duration):
    """Generate a single component with all files"""
    
    # Create class name
    class_name = kebab_to_pascal(component_name)
    
    # Component directory
    comp_dir = os.path.join(BASE_DIR, category_folder, component_name)
    os.makedirs(comp_dir, exist_ok=True)
    
    # TypeScript file
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
    
    # HTML file
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
    
    # SCSS file
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
    print("🚀 Generating Phase 1: Guide Tutorials (23 components)...\n")
    
    generated = []
    for tutorial in TUTORIALS:
        class_name = generate_component(*tutorial)
        generated.append(class_name)
        print(f"✅ Generated: {tutorial[1]}-tutorial → {class_name}")
    
    print(f"\n✅ Phase 1 Complete: {len(generated)}/23 components generated")
    print("\n📋 Component Classes Generated:")
    for cls in generated:
        print(f"  - {cls}")


if __name__ == "__main__":
    main()
