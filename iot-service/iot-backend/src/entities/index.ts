// Export all entities from a single file
export { User } from '../auth/entities/user.entity';
export { AuditLog } from '../audit/entities/audit-log.entity';
export { Notification } from '../notifications/entities/notification.entity';
export { NotificationChannel } from '../notifications/entities/notification-channel.entity';
export { Owner } from './owner.entity';
export { Project } from './project.entity';
export { NodeLocation } from './node-location.entity';
export { NodeModel } from './node-model.entity';
export { NodeModelCommand, CommandChannel } from './node-model-command.entity';
export { Node } from './node.entity';
export { NodeAssignment } from './node-assignment.entity';
export { SensorType } from './sensor-type.entity';
export { SensorCatalog } from './sensor-catalog.entity';
export { Sensor } from './sensor.entity';
export { SensorChannel } from './sensor-channel.entity';
export { SensorLog } from './sensor-log.entity';
export { AlertRule } from './alert-rule.entity';
export { AlertEvent } from './alert-event.entity';
export { AnomalyResult } from './anomaly-result.entity';
export { ForecastResult } from './forecast-result.entity';
export { UserDashboard } from './user-dashboard.entity';
export { DashboardWidget } from './dashboard-widget.entity';
export { OwnerForwardingWebhook } from './owner-forwarding-webhook.entity';
export { OwnerForwardingDatabase } from './owner-forwarding-database.entity';
export { OwnerForwardingLog } from './owner-forwarding-log.entity';
export { NodeUnpairedDevice } from './node-unpaired-device.entity';
export { NodeProfile } from './node-profile.entity';
export { IotLog } from './iot-log.entity';
export { ScadaDiagram } from './scada-diagram.entity';
export { ScadaNode } from './scada-node.entity';
export { ScadaEdge } from './scada-edge.entity';
export { ScadaNodeBinding } from './scada-node-binding.entity';

// Widget Builder entities
export { CustomDashboard } from './custom-dashboard.entity';
export { CustomWidget } from './custom-widget.entity';
export type { WidgetConfig, WidgetFieldMapping, WidgetSeriesConfig, WidgetAxisConfig, WidgetYAxisConfig, WidgetThreshold, WidgetDisplayConfig, WidgetType } from './custom-widget.entity';
export { WidgetQueryTemplate } from './widget-query-template.entity';

// WebGIS entities
export { MapLayer, LayerType, SourceType } from './map-layer.entity';
export type { LayerStyleConfig, LayerConfigJson, BoundingBox } from './map-layer.entity';
export { MapLayerFeature } from './map-layer-feature.entity';
export { MapLayerCategory } from './map-layer-category.entity';
export type { TemplateField, CategoryDefaultStyle } from './map-layer-category.entity';
export { SpatialUploadFile, UploadStatus } from './spatial-upload-file.entity';
export type { ParsedResult, ParsedField, FieldMapping } from './spatial-upload-file.entity';

// Documents
export { Document, DocumentStatus } from './document.entity';

// Report
export { ReportTemplate } from './report-template.entity';
