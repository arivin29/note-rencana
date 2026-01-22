#!/usr/bin/env python3
"""
Generate routing configuration for all 84 tutorials + 2 existing = 86 total
Output: TypeScript routing code ready to paste into document-routing.module.ts
"""

# All tutorials with their routes
# Format: (route_path, component_class, import_path)

ROUTES = [
    # Getting Started (already done)
    ("getting-started/login", "LoginTutorialComponent", "./tutorials/getting-started/login/login-tutorial.component"),
    ("getting-started/first-login", "FirstLoginTutorialComponent", "./tutorials/getting-started/first-login/first-login-tutorial.component"),
    
    # User Guide (9)
    ("user-guide/dashboard-overview", "DashboardOverviewTutorialComponent", "./tutorials/user-guide/dashboard-overview/dashboard-overview-tutorial.component"),
    ("user-guide/view-projects", "ViewProjectsTutorialComponent", "./tutorials/user-guide/view-projects/view-projects-tutorial.component"),
    ("user-guide/view-owners", "ViewOwnersTutorialComponent", "./tutorials/user-guide/view-owners/view-owners-tutorial.component"),
    ("user-guide/view-nodes", "ViewNodesTutorialComponent", "./tutorials/user-guide/view-nodes/view-nodes-tutorial.component"),
    ("user-guide/view-unpaired-devices", "ViewUnpairedDevicesTutorialComponent", "./tutorials/user-guide/view-unpaired-devices/view-unpaired-devices-tutorial.component"),
    ("user-guide/view-sensors", "ViewSensorsTutorialComponent", "./tutorials/user-guide/view-sensors/view-sensors-tutorial.component"),
    ("user-guide/view-telemetry", "ViewTelemetryTutorialComponent", "./tutorials/user-guide/view-telemetry/view-telemetry-tutorial.component"),
    ("user-guide/view-alerts", "ViewAlertsTutorialComponent", "./tutorials/user-guide/view-alerts/view-alerts-tutorial.component"),
    ("user-guide/user-profile-settings", "UserProfileSettingsTutorialComponent", "./tutorials/user-guide/user-profile-settings/user-profile-settings-tutorial.component"),
    
    # Admin Guide (8)
    ("admin-guide/user-management", "UserManagementTutorialComponent", "./tutorials/admin-guide/user-management/user-management-tutorial.component"),
    ("admin-guide/assign-user-roles", "AssignUserRolesTutorialComponent", "./tutorials/admin-guide/assign-user-roles/assign-user-roles-tutorial.component"),
    ("admin-guide/manage-projects", "ManageProjectsTutorialComponent", "./tutorials/admin-guide/manage-projects/manage-projects-tutorial.component"),
    ("admin-guide/node-registration", "NodeRegistrationTutorialComponent", "./tutorials/admin-guide/node-registration/node-registration-tutorial.component"),
    ("admin-guide/sensor-configuration", "SensorConfigurationTutorialComponent", "./tutorials/admin-guide/sensor-configuration/sensor-configuration-tutorial.component"),
    ("admin-guide/alert-rules-setup", "AlertRulesSetupTutorialComponent", "./tutorials/admin-guide/alert-rules-setup/alert-rules-setup-tutorial.component"),
    ("admin-guide/dashboard-customization", "DashboardCustomizationTutorialComponent", "./tutorials/admin-guide/dashboard-customization/dashboard-customization-tutorial.component"),
    ("admin-guide/audit-logs", "AuditLogsTutorialComponent", "./tutorials/admin-guide/audit-logs/audit-logs-tutorial.component"),
    
    # Owner Guide (6)
    ("owner-guide/owner-account-setup", "OwnerAccountSetupTutorialComponent", "./tutorials/owner-guide/owner-account-setup/owner-account-setup-tutorial.component"),
    ("owner-guide/manage-projects", "ManageProjectsTutorialComponent", "./tutorials/owner-guide/manage-projects/manage-projects-tutorial.component"),
    ("owner-guide/data-forwarding-setup", "DataForwardingSetupTutorialComponent", "./tutorials/owner-guide/data-forwarding-setup/data-forwarding-setup-tutorial.component"),
    ("owner-guide/sla-contact-settings", "SlaContactSettingsTutorialComponent", "./tutorials/owner-guide/sla-contact-settings/sla-contact-settings-tutorial.component"),
    ("owner-guide/owner-reports", "OwnerReportsTutorialComponent", "./tutorials/owner-guide/owner-reports/owner-reports-tutorial.component"),
    ("owner-guide/multi-project-management", "MultiProjectManagementTutorialComponent", "./tutorials/owner-guide/multi-project-management/multi-project-management-tutorial.component"),
    
    # Module: Dashboard (7)
    ("module-dashboard/kpi-cards", "KpiCardsTutorialComponent", "./tutorials/module-dashboard/kpi-cards/kpi-cards-tutorial.component"),
    ("module-dashboard/node-health-widget", "NodeHealthWidgetTutorialComponent", "./tutorials/module-dashboard/node-health-widget/node-health-widget-tutorial.component"),
    ("module-dashboard/connectivity-status", "ConnectivityStatusTutorialComponent", "./tutorials/module-dashboard/connectivity-status/connectivity-status-tutorial.component"),
    ("module-dashboard/telemetry-streams", "TelemetryStreamsTutorialComponent", "./tutorials/module-dashboard/telemetry-streams/telemetry-streams-tutorial.component"),
    ("module-dashboard/iot-logs-widget", "IotLogsWidgetTutorialComponent", "./tutorials/module-dashboard/iot-logs-widget/iot-logs-widget-tutorial.component"),
    ("module-dashboard/alert-summary", "AlertSummaryTutorialComponent", "./tutorials/module-dashboard/alert-summary/alert-summary-tutorial.component"),
    ("module-dashboard/custom-dashboards", "CustomDashboardsTutorialComponent", "./tutorials/module-dashboard/custom-dashboards/custom-dashboards-tutorial.component"),
    
    # Module: Owners (5)
    ("module-owners/owner-list", "OwnerListTutorialComponent", "./tutorials/module-owners/owner-list/owner-list-tutorial.component"),
    ("module-owners/owner-details", "OwnerDetailsTutorialComponent", "./tutorials/module-owners/owner-details/owner-details-tutorial.component"),
    ("module-owners/create-owner", "CreateOwnerTutorialComponent", "./tutorials/module-owners/create-owner/create-owner-tutorial.component"),
    ("module-owners/edit-owner", "EditOwnerTutorialComponent", "./tutorials/module-owners/edit-owner/edit-owner-tutorial.component"),
    ("module-owners/owner-projects", "OwnerProjectsTutorialComponent", "./tutorials/module-owners/owner-projects/owner-projects-tutorial.component"),
    
    # Module: Projects (5)
    ("module-projects/project-list", "ProjectListTutorialComponent", "./tutorials/module-projects/project-list/project-list-tutorial.component"),
    ("module-projects/project-details", "ProjectDetailsTutorialComponent", "./tutorials/module-projects/project-details/project-details-tutorial.component"),
    ("module-projects/create-project", "CreateProjectTutorialComponent", "./tutorials/module-projects/create-project/create-project-tutorial.component"),
    ("module-projects/edit-project", "EditProjectTutorialComponent", "./tutorials/module-projects/edit-project/edit-project-tutorial.component"),
    ("module-projects/project-nodes", "ProjectNodesTutorialComponent", "./tutorials/module-projects/project-nodes/project-nodes-tutorial.component"),
    
    # Module: Nodes (7)
    ("module-nodes/node-list-filters", "NodeListFiltersTutorialComponent", "./tutorials/module-nodes/node-list-filters/node-list-filters-tutorial.component"),
    ("module-nodes/node-detail-view", "NodeDetailViewTutorialComponent", "./tutorials/module-nodes/node-detail-view/node-detail-view-tutorial.component"),
    ("module-nodes/node-pairing", "NodePairingTutorialComponent", "./tutorials/module-nodes/node-pairing/node-pairing-tutorial.component"),
    ("module-nodes/unpaired-devices", "UnpairedDevicesTutorialComponent", "./tutorials/module-nodes/unpaired-devices/unpaired-devices-tutorial.component"),
    ("module-nodes/node-location-tracking", "NodeLocationTrackingTutorialComponent", "./tutorials/module-nodes/node-location-tracking/node-location-tracking-tutorial.component"),
    ("module-nodes/node-profiles", "NodeProfilesTutorialComponent", "./tutorials/module-nodes/node-profiles/node-profiles-tutorial.component"),
    ("module-nodes/node-configuration", "NodeConfigurationTutorialComponent", "./tutorials/module-nodes/node-configuration/node-configuration-tutorial.component"),
    
    # Module: Sensors (6)
    ("module-sensors/sensor-list", "SensorListTutorialComponent", "./tutorials/module-sensors/sensor-list/sensor-list-tutorial.component"),
    ("module-sensors/sensor-types", "SensorTypesTutorialComponent", "./tutorials/module-sensors/sensor-types/sensor-types-tutorial.component"),
    ("module-sensors/sensor-catalogs", "SensorCatalogsTutorialComponent", "./tutorials/module-sensors/sensor-catalogs/sensor-catalogs-tutorial.component"),
    ("module-sensors/sensor-channels", "SensorChannelsTutorialComponent", "./tutorials/module-sensors/sensor-channels/sensor-channels-tutorial.component"),
    ("module-sensors/sensor-formulas", "SensorFormulasTutorialComponent", "./tutorials/module-sensors/sensor-formulas/sensor-formulas-tutorial.component"),
    ("module-sensors/sensor-calibration", "SensorCalibrationTutorialComponent", "./tutorials/module-sensors/sensor-calibration/sensor-calibration-tutorial.component"),
    
    # Module: Alerts (5)
    ("module-alerts/alert-rules", "AlertRulesTutorialComponent", "./tutorials/module-alerts/alert-rules/alert-rules-tutorial.component"),
    ("module-alerts/alert-events", "AlertEventsTutorialComponent", "./tutorials/module-alerts/alert-events/alert-events-tutorial.component"),
    ("module-alerts/alert-notifications", "AlertNotificationsTutorialComponent", "./tutorials/module-alerts/alert-notifications/alert-notifications-tutorial.component"),
    ("module-alerts/alert-acknowledgment", "AlertAcknowledgmentTutorialComponent", "./tutorials/module-alerts/alert-acknowledgment/alert-acknowledgment-tutorial.component"),
    ("module-alerts/alert-history", "AlertHistoryTutorialComponent", "./tutorials/module-alerts/alert-history/alert-history-tutorial.component"),
    
    # Module: Reports (4)
    ("module-reports/generate-reports", "GenerateReportsTutorialComponent", "./tutorials/module-reports/generate-reports/generate-reports-tutorial.component"),
    ("module-reports/export-data", "ExportDataTutorialComponent", "./tutorials/module-reports/export-data/export-data-tutorial.component"),
    ("module-reports/scheduled-reports", "ScheduledReportsTutorialComponent", "./tutorials/module-reports/scheduled-reports/scheduled-reports-tutorial.component"),
    ("module-reports/report-templates", "ReportTemplatesTutorialComponent", "./tutorials/module-reports/report-templates/report-templates-tutorial.component"),
    
    # Module: Users (5)
    ("module-users/add-new-user", "AddNewUserTutorialComponent", "./tutorials/module-users/add-new-user/add-new-user-tutorial.component"),
    ("module-users/user-roles", "UserRolesTutorialComponent", "./tutorials/module-users/user-roles/user-roles-tutorial.component"),
    ("module-users/user-permissions", "UserPermissionsTutorialComponent", "./tutorials/module-users/user-permissions/user-permissions-tutorial.component"),
    ("module-users/deactivate-users", "DeactivateUsersTutorialComponent", "./tutorials/module-users/deactivate-users/deactivate-users-tutorial.component"),
    ("module-users/user-activity", "UserActivityTutorialComponent", "./tutorials/module-users/user-activity/user-activity-tutorial.component"),
    
    # Module: Profiles (3)
    ("module-profiles/node-profiles", "NodeProfilesTutorialComponent", "./tutorials/module-profiles/node-profiles/node-profiles-tutorial.component"),
    ("module-profiles/rs485-configuration", "Rs485ConfigurationTutorialComponent", "./tutorials/module-profiles/rs485-configuration/rs485-configuration-tutorial.component"),
    ("module-profiles/profile-builder", "ProfileBuilderTutorialComponent", "./tutorials/module-profiles/profile-builder/profile-builder-tutorial.component"),
    
    # Module: Node Models (3)
    ("module-node-models/node-models-list", "NodeModelsListTutorialComponent", "./tutorials/module-node-models/node-models-list/node-models-list-tutorial.component"),
    ("module-node-models/create-node-model", "CreateNodeModelTutorialComponent", "./tutorials/module-node-models/create-node-model/create-node-model-tutorial.component"),
    ("module-node-models/edit-node-model", "EditNodeModelTutorialComponent", "./tutorials/module-node-models/edit-node-model/edit-node-model-tutorial.component"),
    
    # Troubleshooting (6)
    ("troubleshooting/login-issues", "LoginIssuesTutorialComponent", "./tutorials/troubleshooting/login-issues/login-issues-tutorial.component"),
    ("troubleshooting/node-offline", "NodeOfflineTutorialComponent", "./tutorials/troubleshooting/node-offline/node-offline-tutorial.component"),
    ("troubleshooting/sensor-not-reading", "SensorNotReadingTutorialComponent", "./tutorials/troubleshooting/sensor-not-reading/sensor-not-reading-tutorial.component"),
    ("troubleshooting/alert-not-triggering", "AlertNotTriggeringTutorialComponent", "./tutorials/troubleshooting/alert-not-triggering/alert-not-triggering-tutorial.component"),
    ("troubleshooting/performance-issues", "PerformanceIssuesTutorialComponent", "./tutorials/troubleshooting/performance-issues/performance-issues-tutorial.component"),
    ("troubleshooting/data-export-errors", "DataExportErrorsTutorialComponent", "./tutorials/troubleshooting/data-export-errors/data-export-errors-tutorial.component"),
    
    # FAQ (5)
    ("faq/general-questions", "GeneralQuestionsTutorialComponent", "./tutorials/faq/general-questions/general-questions-tutorial.component"),
    ("faq/account-security", "AccountSecurityTutorialComponent", "./tutorials/faq/account-security/account-security-tutorial.component"),
    ("faq/data-privacy", "DataPrivacyTutorialComponent", "./tutorials/faq/data-privacy/data-privacy-tutorial.component"),
    ("faq/billing-subscription", "BillingSubscriptionTutorialComponent", "./tutorials/faq/billing-subscription/billing-subscription-tutorial.component"),
    ("faq/technical-specs", "TechnicalSpecsTutorialComponent", "./tutorials/faq/technical-specs/technical-specs-tutorial.component"),
]


def generate_imports():
    """Generate import statements"""
    imports = []
    seen = set()
    
    for route_path, component_class, import_path in ROUTES:
        if component_class not in seen:
            imports.append(f"import {{ {component_class} }} from '{import_path}';")
            seen.add(component_class)
    
    return "\n".join(sorted(imports))


def generate_routes():
    """Generate route definitions"""
    route_defs = []
    
    for route_path, component_class, _ in ROUTES:
        route_defs.append(f'''      {{
        path: '{route_path}',
        component: {component_class},
      }},''')
    
    return "\n".join(route_defs)


def main():
    print("="*80)
    print("ROUTING CONFIGURATION GENERATOR")
    print("="*80)
    print(f"\nTotal Routes: {len(ROUTES)}\n")
    
    # Generate imports section
    print("// ========== IMPORTS ==========")
    print("import { NgModule } from '@angular/core';")
    print("import { RouterModule, Routes } from '@angular/router';")
    print("import { DocumentComponent } from './document.component';")
    print("import { TutorialCategoryComponent } from './components/tutorial-category/tutorial-category.component';")
    print()
    print(generate_imports())
    print()
    
    # Generate routes section
    print("// ========== ROUTES ==========")
    print("const routes: Routes = [")
    print("  {")
    print("    path: '',")
    print("    component: DocumentComponent,")
    print("    children: [")
    print("      {")
    print("        path: '',")
    print("        redirectTo: 'getting-started',")
    print("        pathMatch: 'full'")
    print("      },")
    print(generate_routes())
    print("      {")
    print("        path: ':category',")
    print("        component: TutorialCategoryComponent,")
    print("      },")
    print("    ]")
    print("  }")
    print("];")
    print()
    print("@NgModule({")
    print("  imports: [RouterModule.forChild(routes)],")
    print("  exports: [RouterModule]")
    print("})")
    print("export class DocumentRoutingModule { }")
    
    print("\n" + "="*80)
    print(f"✅ Generated {len(ROUTES)} routes")
    print("="*80)


if __name__ == "__main__":
    main()
