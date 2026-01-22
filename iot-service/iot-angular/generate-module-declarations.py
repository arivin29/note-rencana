#!/usr/bin/env python3
"""
Generate module declarations for all 84 tutorial components
Output: Import statements and declarations array entries
"""

# All components to be imported and declared
COMPONENTS = [
    # User Guide (9)
    ("DashboardOverviewTutorialComponent", "./tutorials/user-guide/dashboard-overview/dashboard-overview-tutorial.component"),
    ("ViewProjectsTutorialComponent", "./tutorials/user-guide/view-projects/view-projects-tutorial.component"),
    ("ViewOwnersTutorialComponent", "./tutorials/user-guide/view-owners/view-owners-tutorial.component"),
    ("ViewNodesTutorialComponent", "./tutorials/user-guide/view-nodes/view-nodes-tutorial.component"),
    ("ViewUnpairedDevicesTutorialComponent", "./tutorials/user-guide/view-unpaired-devices/view-unpaired-devices-tutorial.component"),
    ("ViewSensorsTutorialComponent", "./tutorials/user-guide/view-sensors/view-sensors-tutorial.component"),
    ("ViewTelemetryTutorialComponent", "./tutorials/user-guide/view-telemetry/view-telemetry-tutorial.component"),
    ("ViewAlertsTutorialComponent", "./tutorials/user-guide/view-alerts/view-alerts-tutorial.component"),
    ("UserProfileSettingsTutorialComponent", "./tutorials/user-guide/user-profile-settings/user-profile-settings-tutorial.component"),
    
    # Admin Guide (8)
    ("UserManagementTutorialComponent", "./tutorials/admin-guide/user-management/user-management-tutorial.component"),
    ("AssignUserRolesTutorialComponent", "./tutorials/admin-guide/assign-user-roles/assign-user-roles-tutorial.component"),
    ("ManageProjectsTutorialComponent", "./tutorials/admin-guide/manage-projects/manage-projects-tutorial.component"),
    ("NodeRegistrationTutorialComponent", "./tutorials/admin-guide/node-registration/node-registration-tutorial.component"),
    ("SensorConfigurationTutorialComponent", "./tutorials/admin-guide/sensor-configuration/sensor-configuration-tutorial.component"),
    ("AlertRulesSetupTutorialComponent", "./tutorials/admin-guide/alert-rules-setup/alert-rules-setup-tutorial.component"),
    ("DashboardCustomizationTutorialComponent", "./tutorials/admin-guide/dashboard-customization/dashboard-customization-tutorial.component"),
    ("AuditLogsTutorialComponent", "./tutorials/admin-guide/audit-logs/audit-logs-tutorial.component"),
    
    # Owner Guide (6)
    ("OwnerAccountSetupTutorialComponent", "./tutorials/owner-guide/owner-account-setup/owner-account-setup-tutorial.component"),
    ("OwnerManageProjectsTutorialComponent", "./tutorials/owner-guide/manage-projects/manage-projects-tutorial.component"),
    ("DataForwardingSetupTutorialComponent", "./tutorials/owner-guide/data-forwarding-setup/data-forwarding-setup-tutorial.component"),
    ("SlaContactSettingsTutorialComponent", "./tutorials/owner-guide/sla-contact-settings/sla-contact-settings-tutorial.component"),
    ("OwnerReportsTutorialComponent", "./tutorials/owner-guide/owner-reports/owner-reports-tutorial.component"),
    ("MultiProjectManagementTutorialComponent", "./tutorials/owner-guide/multi-project-management/multi-project-management-tutorial.component"),
    
    # Module: Dashboard (7)
    ("KpiCardsTutorialComponent", "./tutorials/module-dashboard/kpi-cards/kpi-cards-tutorial.component"),
    ("NodeHealthWidgetTutorialComponent", "./tutorials/module-dashboard/node-health-widget/node-health-widget-tutorial.component"),
    ("ConnectivityStatusTutorialComponent", "./tutorials/module-dashboard/connectivity-status/connectivity-status-tutorial.component"),
    ("TelemetryStreamsTutorialComponent", "./tutorials/module-dashboard/telemetry-streams/telemetry-streams-tutorial.component"),
    ("IotLogsWidgetTutorialComponent", "./tutorials/module-dashboard/iot-logs-widget/iot-logs-widget-tutorial.component"),
    ("AlertSummaryTutorialComponent", "./tutorials/module-dashboard/alert-summary/alert-summary-tutorial.component"),
    ("CustomDashboardsTutorialComponent", "./tutorials/module-dashboard/custom-dashboards/custom-dashboards-tutorial.component"),
    
    # Module: Owners (5)
    ("OwnerListTutorialComponent", "./tutorials/module-owners/owner-list/owner-list-tutorial.component"),
    ("OwnerDetailsTutorialComponent", "./tutorials/module-owners/owner-details/owner-details-tutorial.component"),
    ("CreateOwnerTutorialComponent", "./tutorials/module-owners/create-owner/create-owner-tutorial.component"),
    ("EditOwnerTutorialComponent", "./tutorials/module-owners/edit-owner/edit-owner-tutorial.component"),
    ("OwnerProjectsTutorialComponent", "./tutorials/module-owners/owner-projects/owner-projects-tutorial.component"),
    
    # Module: Projects (5)
    ("ProjectListTutorialComponent", "./tutorials/module-projects/project-list/project-list-tutorial.component"),
    ("ProjectDetailsTutorialComponent", "./tutorials/module-projects/project-details/project-details-tutorial.component"),
    ("CreateProjectTutorialComponent", "./tutorials/module-projects/create-project/create-project-tutorial.component"),
    ("EditProjectTutorialComponent", "./tutorials/module-projects/edit-project/edit-project-tutorial.component"),
    ("ProjectNodesTutorialComponent", "./tutorials/module-projects/project-nodes/project-nodes-tutorial.component"),
    
    # Module: Nodes (7)
    ("NodeListFiltersTutorialComponent", "./tutorials/module-nodes/node-list-filters/node-list-filters-tutorial.component"),
    ("NodeDetailViewTutorialComponent", "./tutorials/module-nodes/node-detail-view/node-detail-view-tutorial.component"),
    ("NodePairingTutorialComponent", "./tutorials/module-nodes/node-pairing/node-pairing-tutorial.component"),
    ("UnpairedDevicesTutorialComponent", "./tutorials/module-nodes/unpaired-devices/unpaired-devices-tutorial.component"),
    ("NodeLocationTrackingTutorialComponent", "./tutorials/module-nodes/node-location-tracking/node-location-tracking-tutorial.component"),
    ("NodeProfilesTutorialComponent", "./tutorials/module-nodes/node-profiles/node-profiles-tutorial.component"),
    ("NodeConfigurationTutorialComponent", "./tutorials/module-nodes/node-configuration/node-configuration-tutorial.component"),
    
    # Module: Sensors (6)
    ("SensorListTutorialComponent", "./tutorials/module-sensors/sensor-list/sensor-list-tutorial.component"),
    ("SensorTypesTutorialComponent", "./tutorials/module-sensors/sensor-types/sensor-types-tutorial.component"),
    ("SensorCatalogsTutorialComponent", "./tutorials/module-sensors/sensor-catalogs/sensor-catalogs-tutorial.component"),
    ("SensorChannelsTutorialComponent", "./tutorials/module-sensors/sensor-channels/sensor-channels-tutorial.component"),
    ("SensorFormulasTutorialComponent", "./tutorials/module-sensors/sensor-formulas/sensor-formulas-tutorial.component"),
    ("SensorCalibrationTutorialComponent", "./tutorials/module-sensors/sensor-calibration/sensor-calibration-tutorial.component"),
    
    # Module: Alerts (5)
    ("AlertRulesTutorialComponent", "./tutorials/module-alerts/alert-rules/alert-rules-tutorial.component"),
    ("AlertEventsTutorialComponent", "./tutorials/module-alerts/alert-events/alert-events-tutorial.component"),
    ("AlertNotificationsTutorialComponent", "./tutorials/module-alerts/alert-notifications/alert-notifications-tutorial.component"),
    ("AlertAcknowledgmentTutorialComponent", "./tutorials/module-alerts/alert-acknowledgment/alert-acknowledgment-tutorial.component"),
    ("AlertHistoryTutorialComponent", "./tutorials/module-alerts/alert-history/alert-history-tutorial.component"),
    
    # Module: Reports (4)
    ("GenerateReportsTutorialComponent", "./tutorials/module-reports/generate-reports/generate-reports-tutorial.component"),
    ("ExportDataTutorialComponent", "./tutorials/module-reports/export-data/export-data-tutorial.component"),
    ("ScheduledReportsTutorialComponent", "./tutorials/module-reports/scheduled-reports/scheduled-reports-tutorial.component"),
    ("ReportTemplatesTutorialComponent", "./tutorials/module-reports/report-templates/report-templates-tutorial.component"),
    
    # Module: Users (5)
    ("AddNewUserTutorialComponent", "./tutorials/module-users/add-new-user/add-new-user-tutorial.component"),
    ("UserRolesTutorialComponent", "./tutorials/module-users/user-roles/user-roles-tutorial.component"),
    ("UserPermissionsTutorialComponent", "./tutorials/module-users/user-permissions/user-permissions-tutorial.component"),
    ("DeactivateUsersTutorialComponent", "./tutorials/module-users/deactivate-users/deactivate-users-tutorial.component"),
    ("UserActivityTutorialComponent", "./tutorials/module-users/user-activity/user-activity-tutorial.component"),
    
    # Module: Profiles (3)
    ("ModuleNodeProfilesTutorialComponent", "./tutorials/module-profiles/node-profiles/node-profiles-tutorial.component"),
    ("Rs485ConfigurationTutorialComponent", "./tutorials/module-profiles/rs485-configuration/rs485-configuration-tutorial.component"),
    ("ProfileBuilderTutorialComponent", "./tutorials/module-profiles/profile-builder/profile-builder-tutorial.component"),
    
    # Module: Node Models (3)
    ("NodeModelsListTutorialComponent", "./tutorials/module-node-models/node-models-list/node-models-list-tutorial.component"),
    ("CreateNodeModelTutorialComponent", "./tutorials/module-node-models/create-node-model/create-node-model-tutorial.component"),
    ("EditNodeModelTutorialComponent", "./tutorials/module-node-models/edit-node-model/edit-node-model-tutorial.component"),
    
    # Troubleshooting (6)
    ("LoginIssuesTutorialComponent", "./tutorials/troubleshooting/login-issues/login-issues-tutorial.component"),
    ("NodeOfflineTutorialComponent", "./tutorials/troubleshooting/node-offline/node-offline-tutorial.component"),
    ("SensorNotReadingTutorialComponent", "./tutorials/troubleshooting/sensor-not-reading/sensor-not-reading-tutorial.component"),
    ("AlertNotTriggeringTutorialComponent", "./tutorials/troubleshooting/alert-not-triggering/alert-not-triggering-tutorial.component"),
    ("PerformanceIssuesTutorialComponent", "./tutorials/troubleshooting/performance-issues/performance-issues-tutorial.component"),
    ("DataExportErrorsTutorialComponent", "./tutorials/troubleshooting/data-export-errors/data-export-errors-tutorial.component"),
    
    # FAQ (5)
    ("GeneralQuestionsTutorialComponent", "./tutorials/faq/general-questions/general-questions-tutorial.component"),
    ("AccountSecurityTutorialComponent", "./tutorials/faq/account-security/account-security-tutorial.component"),
    ("DataPrivacyTutorialComponent", "./tutorials/faq/data-privacy/data-privacy-tutorial.component"),
    ("BillingSubscriptionTutorialComponent", "./tutorials/faq/billing-subscription/billing-subscription-tutorial.component"),
    ("TechnicalSpecsTutorialComponent", "./tutorials/faq/technical-specs/technical-specs-tutorial.component"),
]


def main():
    print("="*80)
    print("MODULE DECLARATIONS GENERATOR")
    print("="*80)
    print(f"\nTotal Components: {len(COMPONENTS)}\n")
    
    print("// ========== TUTORIAL COMPONENT IMPORTS ==========")
    for component_class, import_path in sorted(COMPONENTS, key=lambda x: x[0]):
        print(f"import {{ {component_class} }} from '{import_path}';")
    
    print("\n// ========== DECLARATIONS ARRAY ENTRIES ==========")
    print("// Add these to declarations: [...]")
    for component_class, _ in sorted(COMPONENTS, key=lambda x: x[0]):
        print(f"        {component_class},")
    
    print("\n" + "="*80)
    print(f"✅ Generated {len(COMPONENTS)} component imports and declarations")
    print("="*80)


if __name__ == "__main__":
    main()
