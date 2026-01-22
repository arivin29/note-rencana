// ========== IMPORTS ==========
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentComponent } from './document.component';
import { TutorialCategoryComponent } from './components/tutorial-category/tutorial-category.component';

import { AccountSecurityTutorialComponent } from './tutorials/faq/account-security/account-security-tutorial.component';
import { AddNewUserTutorialComponent } from './tutorials/module-users/add-new-user/add-new-user-tutorial.component';
import { AlertAcknowledgmentTutorialComponent } from './tutorials/module-alerts/alert-acknowledgment/alert-acknowledgment-tutorial.component';
import { AlertEventsTutorialComponent } from './tutorials/module-alerts/alert-events/alert-events-tutorial.component';
import { AlertHistoryTutorialComponent } from './tutorials/module-alerts/alert-history/alert-history-tutorial.component';
import { AlertNotTriggeringTutorialComponent } from './tutorials/troubleshooting/alert-not-triggering/alert-not-triggering-tutorial.component';
import { AlertNotificationsTutorialComponent } from './tutorials/module-alerts/alert-notifications/alert-notifications-tutorial.component';
import { AlertRulesSetupTutorialComponent } from './tutorials/admin-guide/alert-rules-setup/alert-rules-setup-tutorial.component';
import { AlertRulesTutorialComponent } from './tutorials/module-alerts/alert-rules/alert-rules-tutorial.component';
import { AlertSummaryTutorialComponent } from './tutorials/module-dashboard/alert-summary/alert-summary-tutorial.component';
import { AssignUserRolesTutorialComponent } from './tutorials/admin-guide/assign-user-roles/assign-user-roles-tutorial.component';
import { AuditLogsTutorialComponent } from './tutorials/admin-guide/audit-logs/audit-logs-tutorial.component';
import { BillingSubscriptionTutorialComponent } from './tutorials/faq/billing-subscription/billing-subscription-tutorial.component';
import { ConnectivityStatusTutorialComponent } from './tutorials/module-dashboard/connectivity-status/connectivity-status-tutorial.component';
import { CreateNodeModelTutorialComponent } from './tutorials/module-node-models/create-node-model/create-node-model-tutorial.component';
import { CreateOwnerTutorialComponent } from './tutorials/module-owners/create-owner/create-owner-tutorial.component';
import { CreateProjectTutorialComponent } from './tutorials/module-projects/create-project/create-project-tutorial.component';
import { CustomDashboardsTutorialComponent } from './tutorials/module-dashboard/custom-dashboards/custom-dashboards-tutorial.component';
import { DashboardCustomizationTutorialComponent } from './tutorials/admin-guide/dashboard-customization/dashboard-customization-tutorial.component';
import { DashboardOverviewTutorialComponent } from './tutorials/user-guide/dashboard-overview/dashboard-overview-tutorial.component';
import { DataExportErrorsTutorialComponent } from './tutorials/troubleshooting/data-export-errors/data-export-errors-tutorial.component';
import { DataForwardingSetupTutorialComponent } from './tutorials/owner-guide/data-forwarding-setup/data-forwarding-setup-tutorial.component';
import { DataPrivacyTutorialComponent } from './tutorials/faq/data-privacy/data-privacy-tutorial.component';
import { DeactivateUsersTutorialComponent } from './tutorials/module-users/deactivate-users/deactivate-users-tutorial.component';
import { EditNodeModelTutorialComponent } from './tutorials/module-node-models/edit-node-model/edit-node-model-tutorial.component';
import { EditOwnerTutorialComponent } from './tutorials/module-owners/edit-owner/edit-owner-tutorial.component';
import { EditProjectTutorialComponent } from './tutorials/module-projects/edit-project/edit-project-tutorial.component';
import { ExportDataTutorialComponent } from './tutorials/module-reports/export-data/export-data-tutorial.component';
import { FirstLoginTutorialComponent } from './tutorials/getting-started/first-login/first-login-tutorial.component';
import { GeneralQuestionsTutorialComponent } from './tutorials/faq/general-questions/general-questions-tutorial.component';
import { GenerateReportsTutorialComponent } from './tutorials/module-reports/generate-reports/generate-reports-tutorial.component';
import { IotLogsWidgetTutorialComponent } from './tutorials/module-dashboard/iot-logs-widget/iot-logs-widget-tutorial.component';
import { KpiCardsTutorialComponent } from './tutorials/module-dashboard/kpi-cards/kpi-cards-tutorial.component';
import { LoginIssuesTutorialComponent } from './tutorials/troubleshooting/login-issues/login-issues-tutorial.component';
import { LoginTutorialComponent } from './tutorials/getting-started/login/login-tutorial.component';
import { ManageProjectsTutorialComponent } from './tutorials/admin-guide/manage-projects/manage-projects-tutorial.component';
import { MultiProjectManagementTutorialComponent } from './tutorials/owner-guide/multi-project-management/multi-project-management-tutorial.component';
import { NodeConfigurationTutorialComponent } from './tutorials/module-nodes/node-configuration/node-configuration-tutorial.component';
import { NodeDetailViewTutorialComponent } from './tutorials/module-nodes/node-detail-view/node-detail-view-tutorial.component';
import { NodeHealthWidgetTutorialComponent } from './tutorials/module-dashboard/node-health-widget/node-health-widget-tutorial.component';
import { NodeListFiltersTutorialComponent } from './tutorials/module-nodes/node-list-filters/node-list-filters-tutorial.component';
import { NodeLocationTrackingTutorialComponent } from './tutorials/module-nodes/node-location-tracking/node-location-tracking-tutorial.component';
import { NodeModelsListTutorialComponent } from './tutorials/module-node-models/node-models-list/node-models-list-tutorial.component';
import { NodeOfflineTutorialComponent } from './tutorials/troubleshooting/node-offline/node-offline-tutorial.component';
import { NodePairingTutorialComponent } from './tutorials/module-nodes/node-pairing/node-pairing-tutorial.component';
import { NodeProfilesTutorialComponent } from './tutorials/module-nodes/node-profiles/node-profiles-tutorial.component';
import { NodeRegistrationTutorialComponent } from './tutorials/admin-guide/node-registration/node-registration-tutorial.component';
import { OwnerAccountSetupTutorialComponent } from './tutorials/owner-guide/owner-account-setup/owner-account-setup-tutorial.component';
import { OwnerDetailsTutorialComponent } from './tutorials/module-owners/owner-details/owner-details-tutorial.component';
import { OwnerListTutorialComponent } from './tutorials/module-owners/owner-list/owner-list-tutorial.component';
import { OwnerProjectsTutorialComponent } from './tutorials/module-owners/owner-projects/owner-projects-tutorial.component';
import { OwnerReportsTutorialComponent } from './tutorials/owner-guide/owner-reports/owner-reports-tutorial.component';
import { PerformanceIssuesTutorialComponent } from './tutorials/troubleshooting/performance-issues/performance-issues-tutorial.component';
import { ProfileBuilderTutorialComponent } from './tutorials/module-profiles/profile-builder/profile-builder-tutorial.component';
import { ProjectDetailsTutorialComponent } from './tutorials/module-projects/project-details/project-details-tutorial.component';
import { ProjectListTutorialComponent } from './tutorials/module-projects/project-list/project-list-tutorial.component';
import { ProjectNodesTutorialComponent } from './tutorials/module-projects/project-nodes/project-nodes-tutorial.component';
import { ReportTemplatesTutorialComponent } from './tutorials/module-reports/report-templates/report-templates-tutorial.component';
import { Rs485ConfigurationTutorialComponent } from './tutorials/module-profiles/rs485-configuration/rs485-configuration-tutorial.component';
import { ScheduledReportsTutorialComponent } from './tutorials/module-reports/scheduled-reports/scheduled-reports-tutorial.component';
import { SensorCalibrationTutorialComponent } from './tutorials/module-sensors/sensor-calibration/sensor-calibration-tutorial.component';
import { SensorCatalogsTutorialComponent } from './tutorials/module-sensors/sensor-catalogs/sensor-catalogs-tutorial.component';
import { SensorChannelsTutorialComponent } from './tutorials/module-sensors/sensor-channels/sensor-channels-tutorial.component';
import { SensorConfigurationTutorialComponent } from './tutorials/admin-guide/sensor-configuration/sensor-configuration-tutorial.component';
import { SensorDetailTutorialComponent } from './tutorials/module-sensors/sensor-detail/sensor-detail-tutorial.component';
import { SensorFormulasTutorialComponent } from './tutorials/module-sensors/sensor-formulas/sensor-formulas-tutorial.component';
import { SensorListTutorialComponent } from './tutorials/module-sensors/sensor-list/sensor-list-tutorial.component';
import { SensorNotReadingTutorialComponent } from './tutorials/troubleshooting/sensor-not-reading/sensor-not-reading-tutorial.component';
import { SensorTypesTutorialComponent } from './tutorials/module-sensors/sensor-types/sensor-types-tutorial.component';
import { SlaContactSettingsTutorialComponent } from './tutorials/owner-guide/sla-contact-settings/sla-contact-settings-tutorial.component';
import { TechnicalSpecsTutorialComponent } from './tutorials/faq/technical-specs/technical-specs-tutorial.component';
import { TelemetryAggregatesTutorialComponent } from './tutorials/module-dashboard/telemetry-aggregates/telemetry-aggregates-tutorial.component';
import { TelemetryStreamsTutorialComponent } from './tutorials/module-dashboard/telemetry-streams/telemetry-streams-tutorial.component';
import { UnpairedDevicesTutorialComponent } from './tutorials/module-nodes/unpaired-devices/unpaired-devices-tutorial.component';
import { UserActivityTutorialComponent } from './tutorials/module-users/user-activity/user-activity-tutorial.component';
import { UserManagementTutorialComponent } from './tutorials/admin-guide/user-management/user-management-tutorial.component';
import { UserPermissionsTutorialComponent } from './tutorials/module-users/user-permissions/user-permissions-tutorial.component';
import { UserProfileSettingsTutorialComponent } from './tutorials/user-guide/user-profile-settings/user-profile-settings-tutorial.component';
import { UserRolesTutorialComponent } from './tutorials/module-users/user-roles/user-roles-tutorial.component';
import { ViewAlertsTutorialComponent } from './tutorials/user-guide/view-alerts/view-alerts-tutorial.component';
import { ViewNodesTutorialComponent } from './tutorials/user-guide/view-nodes/view-nodes-tutorial.component';
import { ViewOwnersTutorialComponent } from './tutorials/user-guide/view-owners/view-owners-tutorial.component';
import { ViewProjectsTutorialComponent } from './tutorials/user-guide/view-projects/view-projects-tutorial.component';
import { ViewSensorsTutorialComponent } from './tutorials/user-guide/view-sensors/view-sensors-tutorial.component';
import { ViewTelemetryTutorialComponent } from './tutorials/user-guide/view-telemetry/view-telemetry-tutorial.component';
import { ViewUnpairedDevicesTutorialComponent } from './tutorials/user-guide/view-unpaired-devices/view-unpaired-devices-tutorial.component';

// ========== ROUTES ==========
const routes: Routes = [
  {
    path: '',
    component: DocumentComponent,
    children: [
      {
        path: '',
        redirectTo: 'getting-started',
        pathMatch: 'full'
      },
      {
        path: 'getting-started/login',
        component: LoginTutorialComponent,
      },
      {
        path: 'getting-started/first-login',
        component: FirstLoginTutorialComponent,
      },
      {
        path: 'user-guide/dashboard-overview',
        component: DashboardOverviewTutorialComponent,
      },
      {
        path: 'user-guide/view-projects',
        component: ViewProjectsTutorialComponent,
      },
      {
        path: 'user-guide/view-owners',
        component: ViewOwnersTutorialComponent,
      },
      {
        path: 'user-guide/view-nodes',
        component: ViewNodesTutorialComponent,
      },
      {
        path: 'user-guide/view-unpaired-devices',
        component: ViewUnpairedDevicesTutorialComponent,
      },
      {
        path: 'user-guide/view-sensors',
        component: ViewSensorsTutorialComponent,
      },
      {
        path: 'user-guide/view-telemetry',
        component: ViewTelemetryTutorialComponent,
      },
      {
        path: 'user-guide/view-alerts',
        component: ViewAlertsTutorialComponent,
      },
      {
        path: 'user-guide/user-profile-settings',
        component: UserProfileSettingsTutorialComponent,
      },
      {
        path: 'admin-guide/user-management',
        component: UserManagementTutorialComponent,
      },
      {
        path: 'admin-guide/assign-user-roles',
        component: AssignUserRolesTutorialComponent,
      },
      {
        path: 'admin-guide/manage-projects',
        component: ManageProjectsTutorialComponent,
      },
      {
        path: 'admin-guide/node-registration',
        component: NodeRegistrationTutorialComponent,
      },
      {
        path: 'admin-guide/sensor-configuration',
        component: SensorConfigurationTutorialComponent,
      },
      {
        path: 'admin-guide/alert-rules-setup',
        component: AlertRulesSetupTutorialComponent,
      },
      {
        path: 'admin-guide/dashboard-customization',
        component: DashboardCustomizationTutorialComponent,
      },
      {
        path: 'admin-guide/audit-logs',
        component: AuditLogsTutorialComponent,
      },
      {
        path: 'owner-guide/owner-account-setup',
        component: OwnerAccountSetupTutorialComponent,
      },
      {
        path: 'owner-guide/manage-projects',
        component: ManageProjectsTutorialComponent,
      },
      {
        path: 'owner-guide/data-forwarding-setup',
        component: DataForwardingSetupTutorialComponent,
      },
      {
        path: 'owner-guide/sla-contact-settings',
        component: SlaContactSettingsTutorialComponent,
      },
      {
        path: 'owner-guide/owner-reports',
        component: OwnerReportsTutorialComponent,
      },
      {
        path: 'owner-guide/multi-project-management',
        component: MultiProjectManagementTutorialComponent,
      },
      {
        path: 'module-dashboard/kpi-cards',
        component: KpiCardsTutorialComponent,
      },
      {
        path: 'module-dashboard/node-health-widget',
        component: NodeHealthWidgetTutorialComponent,
      },
      {
        path: 'module-dashboard/connectivity-status',
        component: ConnectivityStatusTutorialComponent,
      },
      {
        path: 'module-dashboard/telemetry-streams',
        component: TelemetryStreamsTutorialComponent,
      },
      {
        path: 'module-dashboard/telemetry-aggregates',
        component: TelemetryAggregatesTutorialComponent,
      },
      {
        path: 'module-dashboard/iot-logs-widget',
        component: IotLogsWidgetTutorialComponent,
      },
      {
        path: 'module-dashboard/alert-summary',
        component: AlertSummaryTutorialComponent,
      },
      {
        path: 'module-dashboard/custom-dashboards',
        component: CustomDashboardsTutorialComponent,
      },
      {
        path: 'module-owners/owner-list',
        component: OwnerListTutorialComponent,
      },
      {
        path: 'module-owners/owner-details',
        component: OwnerDetailsTutorialComponent,
      },
      {
        path: 'module-owners/create-owner',
        component: CreateOwnerTutorialComponent,
      },
      {
        path: 'module-owners/edit-owner',
        component: EditOwnerTutorialComponent,
      },
      {
        path: 'module-owners/owner-projects',
        component: OwnerProjectsTutorialComponent,
      },
      {
        path: 'module-projects/project-list',
        component: ProjectListTutorialComponent,
      },
      {
        path: 'module-projects/project-details',
        component: ProjectDetailsTutorialComponent,
      },
      {
        path: 'module-projects/create-project',
        component: CreateProjectTutorialComponent,
      },
      {
        path: 'module-projects/edit-project',
        component: EditProjectTutorialComponent,
      },
      {
        path: 'module-projects/project-nodes',
        component: ProjectNodesTutorialComponent,
      },
      {
        path: 'module-nodes/node-list-filters',
        component: NodeListFiltersTutorialComponent,
      },
      {
        path: 'module-nodes/node-detail-view',
        component: NodeDetailViewTutorialComponent,
      },
      {
        path: 'module-nodes/node-pairing',
        component: NodePairingTutorialComponent,
      },
      {
        path: 'module-nodes/unpaired-devices',
        component: UnpairedDevicesTutorialComponent,
      },
      {
        path: 'module-nodes/node-location-tracking',
        component: NodeLocationTrackingTutorialComponent,
      },
      {
        path: 'module-nodes/node-profiles',
        component: NodeProfilesTutorialComponent,
      },
      {
        path: 'module-nodes/node-configuration',
        component: NodeConfigurationTutorialComponent,
      },
      {
        path: 'module-sensors/sensor-list',
        component: SensorListTutorialComponent,
      },
      {
        path: 'module-sensors/sensor-types',
        component: SensorTypesTutorialComponent,
      },
      {
        path: 'module-sensors/sensor-catalogs',
        component: SensorCatalogsTutorialComponent,
      },
      {
        path: 'module-sensors/sensor-detail',
        component: SensorDetailTutorialComponent,
      },
      {
        path: 'module-sensors/sensor-channels',
        component: SensorChannelsTutorialComponent,
      },
      {
        path: 'module-sensors/sensor-formulas',
        component: SensorFormulasTutorialComponent,
      },
      {
        path: 'module-sensors/sensor-calibration',
        component: SensorCalibrationTutorialComponent,
      },
      {
        path: 'module-alerts/alert-rules',
        component: AlertRulesTutorialComponent,
      },
      {
        path: 'module-alerts/alert-events',
        component: AlertEventsTutorialComponent,
      },
      {
        path: 'module-alerts/alert-notifications',
        component: AlertNotificationsTutorialComponent,
      },
      {
        path: 'module-alerts/alert-acknowledgment',
        component: AlertAcknowledgmentTutorialComponent,
      },
      {
        path: 'module-alerts/alert-history',
        component: AlertHistoryTutorialComponent,
      },
      {
        path: 'module-reports/generate-reports',
        component: GenerateReportsTutorialComponent,
      },
      {
        path: 'module-reports/export-data',
        component: ExportDataTutorialComponent,
      },
      {
        path: 'module-reports/scheduled-reports',
        component: ScheduledReportsTutorialComponent,
      },
      {
        path: 'module-reports/report-templates',
        component: ReportTemplatesTutorialComponent,
      },
      {
        path: 'module-users/add-new-user',
        component: AddNewUserTutorialComponent,
      },
      {
        path: 'module-users/user-roles',
        component: UserRolesTutorialComponent,
      },
      {
        path: 'module-users/user-permissions',
        component: UserPermissionsTutorialComponent,
      },
      {
        path: 'module-users/deactivate-users',
        component: DeactivateUsersTutorialComponent,
      },
      {
        path: 'module-users/user-activity',
        component: UserActivityTutorialComponent,
      },
      {
        path: 'module-profiles/node-profiles',
        component: NodeProfilesTutorialComponent,
      },
      {
        path: 'module-profiles/rs485-configuration',
        component: Rs485ConfigurationTutorialComponent,
      },
      {
        path: 'module-profiles/profile-builder',
        component: ProfileBuilderTutorialComponent,
      },
      {
        path: 'module-node-models/node-models-list',
        component: NodeModelsListTutorialComponent,
      },
      {
        path: 'module-node-models/create-node-model',
        component: CreateNodeModelTutorialComponent,
      },
      {
        path: 'module-node-models/edit-node-model',
        component: EditNodeModelTutorialComponent,
      },
      {
        path: 'troubleshooting/login-issues',
        component: LoginIssuesTutorialComponent,
      },
      {
        path: 'troubleshooting/node-offline',
        component: NodeOfflineTutorialComponent,
      },
      {
        path: 'troubleshooting/sensor-not-reading',
        component: SensorNotReadingTutorialComponent,
      },
      {
        path: 'troubleshooting/alert-not-triggering',
        component: AlertNotTriggeringTutorialComponent,
      },
      {
        path: 'troubleshooting/performance-issues',
        component: PerformanceIssuesTutorialComponent,
      },
      {
        path: 'troubleshooting/data-export-errors',
        component: DataExportErrorsTutorialComponent,
      },
      {
        path: 'faq/general-questions',
        component: GeneralQuestionsTutorialComponent,
      },
      {
        path: 'faq/account-security',
        component: AccountSecurityTutorialComponent,
      },
      {
        path: 'faq/data-privacy',
        component: DataPrivacyTutorialComponent,
      },
      {
        path: 'faq/billing-subscription',
        component: BillingSubscriptionTutorialComponent,
      },
      {
        path: 'faq/technical-specs',
        component: TechnicalSpecsTutorialComponent,
      },
      {
        path: ':category',
        component: TutorialCategoryComponent,
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocumentRoutingModule { }
