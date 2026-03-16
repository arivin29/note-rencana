create table public.alert_events (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_alert_event uuid primary key not null default gen_random_uuid(),
  id_alert_rule uuid not null,
  triggered_at timestamp with time zone not null,
  value double precision,
  status text default 'open'::text,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  cleared_by uuid,
  cleared_at timestamp with time zone,
  note text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_alert_rule) references public.alert_rules (id_alert_rule)
  match simple on update no action on delete cascade
);

create table public.alert_rules (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_alert_rule uuid primary key not null default gen_random_uuid(),
  id_sensor_channel uuid not null,
  rule_type text not null,
  severity text,
  params_json jsonb,
  enabled boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_sensor_channel) references public.sensor_channels (id_sensor_channel)
  match simple on update no action on delete cascade
);

create table public.anomaly_results (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_anomaly_result uuid primary key not null default gen_random_uuid(),
  id_sensor_channel uuid not null,
  detected_at timestamp with time zone not null,
  actual_value double precision not null,
  expected_value double precision,
  anomaly_score double precision not null, -- Score from 0.0 to 1.0, higher = more anomalous
  anomaly_grade text not null, -- mild (0.5-0.7), moderate (0.7-0.85), severe (0.85-0.95), critical (>0.95)
  anomaly_type text not null,
  detector_id text,
  detector_name text,
  opensearch_result jsonb, -- Raw JSON result from OpenSearch ML detector
  id_alert_event uuid,
  is_acknowledged boolean default false,
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  note text,
  created_at timestamp with time zone default now(),
  foreign key (id_alert_event) references public.alert_events (id_alert_event)
  match simple on update no action on delete set null,
  foreign key (id_sensor_channel) references public.sensor_channels (id_sensor_channel)
  match simple on update no action on delete cascade
);
create index idx_anomaly_results_channel_time on anomaly_results using btree (id_sensor_channel, detected_at);
create index idx_anomaly_results_detector_time on anomaly_results using btree (detector_id, detected_at);
create index idx_anomaly_results_grade on anomaly_results using btree (anomaly_grade) WHERE (anomaly_grade = ANY (ARRAY['severe'::text, 'critical'::text]));
create index idx_anomaly_results_unack on anomaly_results using btree (is_acknowledged) WHERE (is_acknowledged = false);
comment on table public.anomaly_results is 'Stores ML anomaly detection results from OpenSearch';
comment on column public.anomaly_results.anomaly_score is 'Score from 0.0 to 1.0, higher = more anomalous';
comment on column public.anomaly_results.anomaly_grade is 'mild (0.5-0.7), moderate (0.7-0.85), severe (0.85-0.95), critical (>0.95)';
comment on column public.anomaly_results.opensearch_result is 'Raw JSON result from OpenSearch ML detector';

create table public.audit_logs (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_audit_log uuid primary key not null default gen_random_uuid(),
  id_user uuid,
  action character varying(100) not null, -- Action performed: login, logout, create, update, delete, etc
  resource_type character varying(100), -- Type of resource: node, sensor, user, owner, etc
  resource_id uuid,
  changes jsonb, -- JSON object containing before/after values
  ip_address character varying(45),
  user_agent text,
  status character varying(50) default 'success',
  error_message text,
  created_at timestamp with time zone default now(),
  entity_type character varying(100),
  entity_id uuid,
  description text,
  request_method character varying(10),
  request_url text,
  old_values jsonb,
  new_values jsonb,
  foreign key (id_user) references public.users (id_user)
  match simple on update no action on delete set null
);
create index idx_audit_logs_id_user on audit_logs using btree (id_user);
create index idx_audit_logs_action on audit_logs using btree (action);
create index idx_audit_logs_resource_type on audit_logs using btree (resource_type);
create index idx_audit_logs_created_at on audit_logs using btree (created_at);
create index idx_audit_logs_entity on audit_logs using btree (entity_type, entity_id);
create index idx_audit_logs_status on audit_logs using btree (status);
comment on table public.audit_logs is 'Comprehensive audit trail for all system actions';
comment on column public.audit_logs.action is 'Action performed: login, logout, create, update, delete, etc';
comment on column public.audit_logs.resource_type is 'Type of resource: node, sensor, user, owner, etc';
comment on column public.audit_logs.changes is 'JSON object containing before/after values';

create table public.custom_dashboards (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_dashboard uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  name character varying(255) not null,
  description text,
  layout_config jsonb default '{}'::jsonb,
  time_range character varying(20) default '6h',
  refresh_interval integer default 60,
  is_default boolean default false,
  is_active boolean default true,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  id_project uuid,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete set null,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade,
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete set null
);
create index idx_custom_dashboards_owner on custom_dashboards using btree (id_owner);
create index idx_custom_dashboards_created_by on custom_dashboards using btree (created_by);
create index idx_custom_dashboards_project on custom_dashboards using btree (id_project);
comment on table public.custom_dashboards is 'Custom dashboards with SQL-based widgets';

create table public.custom_dashboards (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_dashboard uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  name character varying(255) not null,
  description text,
  layout_config jsonb default '{}'::jsonb,
  time_range character varying(20) default '6h',
  refresh_interval integer default 60,
  is_default boolean default false,
  is_active boolean default true,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  id_project uuid,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete set null,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade,
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete set null
);
create index idx_custom_dashboards_owner on custom_dashboards using btree (id_owner);
create index idx_custom_dashboards_created_by on custom_dashboards using btree (created_by);
create index idx_custom_dashboards_project on custom_dashboards using btree (id_project);
comment on table public.custom_dashboards is 'Custom dashboards with SQL-based widgets';

create table public.custom_widgets (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_widget uuid primary key not null default gen_random_uuid(),
  id_dashboard uuid not null,
  name character varying(255) not null,
  widget_type character varying(50) not null, -- line-chart, bar-chart, gauge, pie-chart, value-card, data-table
  position_x integer default 0,
  position_y integer default 0,
  cols integer default 6,
  rows integer default 4,
  sql_query text not null, -- SELECT query only - validated before execution
  config jsonb not null default '{}'::jsonb, -- JSON config: mapping, series, xAxis, yAxis, thresholds, display
  is_active boolean default true,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  data_source character varying(20) default 'postgresql', -- Data source for query execution: postgresql or clickhouse
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete set null,
  foreign key (id_dashboard) references public.custom_dashboards (id_dashboard)
  match simple on update no action on delete cascade
);
create index idx_custom_widgets_dashboard on custom_widgets using btree (id_dashboard);
create index idx_custom_widgets_type on custom_widgets using btree (widget_type);
create index idx_custom_widgets_data_source on custom_widgets using btree (data_source);
comment on table public.custom_widgets is 'Widgets with custom SQL queries and configurations';
comment on column public.custom_widgets.widget_type is 'line-chart, bar-chart, gauge, pie-chart, value-card, data-table';
comment on column public.custom_widgets.sql_query is 'SELECT query only - validated before execution';
comment on column public.custom_widgets.config is 'JSON config: mapping, series, xAxis, yAxis, thresholds, display';
comment on column public.custom_widgets.data_source is 'Data source for query execution: postgresql or clickhouse';

create table public.documents (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_document uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  from_module character varying(100) not null,
  from_module_id uuid not null,
  original_filename character varying(500) not null,
  stored_filename character varying(500) not null,
  file_path text not null,
  mime_type character varying(100),
  file_size bigint default 0,
  file_extension character varying(50),
  document_type character varying(100),
  status character varying(50) default 'uploaded',
  metadata jsonb default '{}'::jsonb,
  created_by character varying(255),
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP,
  error_message text
);
create index idx_documents_module on documents using btree (from_module, from_module_id);
create index idx_documents_owner on documents using btree (id_owner);
create index idx_documents_status on documents using btree (status);
create index idx_documents_created on documents using btree (created_at);

create table public.documents (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_document uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  from_module character varying(100) not null,
  from_module_id uuid not null,
  original_filename character varying(500) not null,
  stored_filename character varying(500) not null,
  file_path text not null,
  mime_type character varying(100),
  file_size bigint default 0,
  file_extension character varying(50),
  document_type character varying(100),
  status character varying(50) default 'uploaded',
  metadata jsonb default '{}'::jsonb,
  created_by character varying(255),
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP,
  error_message text
);
create index idx_documents_module on documents using btree (from_module, from_module_id);
create index idx_documents_owner on documents using btree (id_owner);
create index idx_documents_status on documents using btree (status);
create index idx_documents_created on documents using btree (created_at);

create table public.forecast_results (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_forecast_result uuid primary key not null default gen_random_uuid(),
  id_sensor_channel uuid not null,
  forecast_batch_id text not null, -- Groups all forecasts generated in one run (UUID)
  generated_at timestamp with time zone not null,
  forecast_time timestamp with time zone not null, -- The future timestamp being predicted
  predicted_value double precision not null, -- The predicted sensor value for forecast_time
  lower_bound double precision, -- Lower bound of prediction interval (for anomaly detection)
  upper_bound double precision, -- Upper bound of prediction interval (for anomaly detection)
  confidence double precision,
  model_type text,
  model_metadata jsonb,
  is_current boolean default true, -- True if this is the latest forecast for this time slot
  created_at timestamp with time zone default now(),
  foreign key (id_sensor_channel) references public.sensor_channels (id_sensor_channel)
  match simple on update no action on delete cascade
);
create index idx_forecast_channel_time on forecast_results using btree (id_sensor_channel, forecast_time);
create index idx_forecast_batch on forecast_results using btree (forecast_batch_id);
create index idx_forecast_current on forecast_results using btree (id_sensor_channel, is_current) WHERE (is_current = true);
create index idx_forecast_generated on forecast_results using btree (generated_at);
create unique index idx_forecast_unique_current on forecast_results using btree (id_sensor_channel, forecast_time) WHERE (is_current = true);
comment on table public.forecast_results is 'Stores ML forecast predictions for sensor channels';
comment on column public.forecast_results.forecast_batch_id is 'Groups all forecasts generated in one run (UUID)';
comment on column public.forecast_results.forecast_time is 'The future timestamp being predicted';
comment on column public.forecast_results.predicted_value is 'The predicted sensor value for forecast_time';
comment on column public.forecast_results.lower_bound is 'Lower bound of prediction interval (for anomaly detection)';
comment on column public.forecast_results.upper_bound is 'Upper bound of prediction interval (for anomaly detection)';
comment on column public.forecast_results.is_current is 'True if this is the latest forecast for this time slot';

create table public.iot_log (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id uuid primary key not null default uuid_generate_v4(),
  label log_label_enum not null default 'log'::log_label_enum,
  topic character varying(500),
  payload jsonb not null,
  device_id character varying(255),
  timestamp timestamp without time zone not null,
  processed boolean not null default false,
  notes text,
  created_at timestamp without time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone not null default CURRENT_TIMESTAMP
);
create index "IDX_iot_log_label" on iot_log using btree (label);
create index "IDX_iot_log_device_id" on iot_log using btree (device_id);
create index "IDX_iot_log_processed" on iot_log using btree (processed);
create index "IDX_iot_log_created_at" on iot_log using btree (created_at);
create index "IDX_iot_log_timestamp" on iot_log using btree (timestamp);

create table public.map_layer (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_layer uuid primary key not null default uuid_generate_v4(),
  id_owner uuid,
  id_project uuid,
  layer_name character varying(255) not null,
  layer_code character varying(100),
  layer_description text,
  layer_type character varying(20) not null default 'custom',
  source_type character varying(20) not null default 'geojson',
  category_code character varying(100),
  geometry_type character varying(50),
  srid integer default 4326,
  bbox jsonb,
  feature_count integer default 0,
  source_table character varying(255),
  source_ref character varying(500),
  style_json jsonb default '{}'::jsonb,
  config_json jsonb default '{}'::jsonb,
  is_visible_default boolean default true,
  is_core boolean default false,
  is_locked boolean default false,
  display_order integer default 0,
  created_by uuid,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP
);
create unique index unique_layer_code_project on map_layer using btree (id_project, layer_code);
create index idx_layer_owner on map_layer using btree (id_owner);
create index idx_layer_project on map_layer using btree (id_project);
create index idx_layer_type on map_layer using btree (layer_type);
create index idx_layer_category on map_layer using btree (category_code);

create table public.map_layer (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_layer uuid primary key not null default uuid_generate_v4(),
  id_owner uuid,
  id_project uuid,
  layer_name character varying(255) not null,
  layer_code character varying(100),
  layer_description text,
  layer_type character varying(20) not null default 'custom',
  source_type character varying(20) not null default 'geojson',
  category_code character varying(100),
  geometry_type character varying(50),
  srid integer default 4326,
  bbox jsonb,
  feature_count integer default 0,
  source_table character varying(255),
  source_ref character varying(500),
  style_json jsonb default '{}'::jsonb,
  config_json jsonb default '{}'::jsonb,
  is_visible_default boolean default true,
  is_core boolean default false,
  is_locked boolean default false,
  display_order integer default 0,
  created_by uuid,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP
);
create unique index unique_layer_code_project on map_layer using btree (id_project, layer_code);
create index idx_layer_owner on map_layer using btree (id_owner);
create index idx_layer_project on map_layer using btree (id_project);
create index idx_layer_type on map_layer using btree (layer_type);
create index idx_layer_category on map_layer using btree (category_code);

create table public.map_layer_category (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_category uuid primary key not null default uuid_generate_v4(),
  id_owner uuid,
  category_code character varying(100) not null,
  category_name character varying(255) not null,
  description text,
  industry_code character varying(50),
  parent_category_id uuid,
  allowed_geometry_types text[] default ARRAY['Point'::text, 'LineString'::text, 'Polygon'::text],
  template_fields jsonb default '[]'::jsonb,
  default_style jsonb default '{}'::jsonb,
  icon_default character varying(255),
  color_default character varying(50),
  is_system boolean default false,
  is_operational boolean default false,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP,
  foreign key (parent_category_id) references public.map_layer_category (id_category)
  match simple on update no action on delete no action
);
create unique index unique_category_code_owner on map_layer_category using btree (id_owner, category_code);
create index idx_category_owner on map_layer_category using btree (id_owner);
create index idx_category_industry on map_layer_category using btree (industry_code);

create table public.map_layer_category (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_category uuid primary key not null default uuid_generate_v4(),
  id_owner uuid,
  category_code character varying(100) not null,
  category_name character varying(255) not null,
  description text,
  industry_code character varying(50),
  parent_category_id uuid,
  allowed_geometry_types text[] default ARRAY['Point'::text, 'LineString'::text, 'Polygon'::text],
  template_fields jsonb default '[]'::jsonb,
  default_style jsonb default '{}'::jsonb,
  icon_default character varying(255),
  color_default character varying(50),
  is_system boolean default false,
  is_operational boolean default false,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP,
  foreign key (parent_category_id) references public.map_layer_category (id_category)
  match simple on update no action on delete no action
);
create unique index unique_category_code_owner on map_layer_category using btree (id_owner, category_code);
create index idx_category_owner on map_layer_category using btree (id_owner);
create index idx_category_industry on map_layer_category using btree (industry_code);

create table public.map_layer_feature (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_feature uuid primary key not null default uuid_generate_v4(),
  id_layer uuid not null,
  geometry_json jsonb,
  properties_json jsonb default '{}'::jsonb,
  label character varying(500),
  external_id character varying(255),
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP,
  foreign key (id_layer) references public.map_layer (id_layer)
  match simple on update no action on delete cascade
);
create index idx_feature_layer on map_layer_feature using btree (id_layer);
create index idx_feature_external on map_layer_feature using btree (external_id);

create table public.map_layer_feature (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_feature uuid primary key not null default uuid_generate_v4(),
  id_layer uuid not null,
  geometry_json jsonb,
  properties_json jsonb default '{}'::jsonb,
  label character varying(500),
  external_id character varying(255),
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP,
  foreign key (id_layer) references public.map_layer (id_layer)
  match simple on update no action on delete cascade
);
create index idx_feature_layer on map_layer_feature using btree (id_layer);
create index idx_feature_external on map_layer_feature using btree (external_id);

create table public.migrations (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id integer primary key not null default nextval('migrations_id_seq'::regclass),
  timestamp bigint not null,
  name character varying not null
);

create table public.node_assignments (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_node_assignment uuid primary key not null default gen_random_uuid(),
  id_node uuid not null,
  id_project uuid not null,
  id_owner uuid not null,
  id_node_location uuid,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone,
  reason text,
  assigned_by uuid,
  ticket_ref text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_node) references public.nodes (id_node)
  match simple on update no action on delete cascade,
  foreign key (id_node_location) references public.node_locations (id_node_location)
  match simple on update no action on delete no action,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete no action,
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete no action
);

create table public.node_locations (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_node_location uuid primary key not null default gen_random_uuid(),
  id_project uuid not null,
  type text default 'manual'::text,
  coordinates point not null,
  elevation numeric(6,2),
  address text,
  precision_m numeric(6,2),
  source text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete cascade
);

create table public.node_models (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_node_model uuid primary key not null default gen_random_uuid(),
  model_code text,
  vendor text not null,
  model_name text not null,
  protocol text not null,
  communication_band text,
  power_type text,
  hardware_class text,
  hardware_revision text,
  toolchain text,
  build_agent text,
  firmware_repo text,
  flash_protocol text,
  supports_codegen boolean default false,
  default_firmware text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create unique index node_models_model_code_key on node_models using btree (model_code);

create table public.node_profiles (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_node_profile uuid primary key not null default gen_random_uuid(),
  id_node_model uuid not null,
  id_project uuid,
  code text not null,
  name text not null,
  description text,
  parser_type text not null, -- Parser type: json_path, lorawan, modbus, etc.
  mapping_json jsonb not null, -- JSON mapping configuration for parsing payloads to sensor channels
  transform_script text,
  enabled boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid,
  updated_by uuid,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete no action,
  foreign key (id_node_model) references public.node_models (id_node_model)
  match simple on update no action on delete cascade,
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete set null,
  foreign key (updated_by) references public.users (id_user)
  match simple on update no action on delete no action
);
create unique index node_profiles_id_node_model_code_key on node_profiles using btree (id_node_model, code);
create index idx_node_profiles_node_model on node_profiles using btree (id_node_model);
create index idx_node_profiles_project on node_profiles using btree (id_project);
create index idx_node_profiles_created_by on node_profiles using btree (created_by);
comment on table public.node_profiles is 'Payload parsing profiles for different node models';
comment on column public.node_profiles.parser_type is 'Parser type: json_path, lorawan, modbus, etc.';
comment on column public.node_profiles.mapping_json is 'JSON mapping configuration for parsing payloads to sensor channels';

create table public.node_unpaired_devices (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_node_unpaired_device uuid primary key not null default gen_random_uuid(),
  hardware_id text not null, -- Unique hardware identifier: IMEI, dev_eui, MAC address, serial number
  id_node_model uuid, -- Auto-detected or manually assigned node model
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  last_topic text, -- Last MQTT topic where data was received
  seen_count integer not null default 1, -- Number of times this device has sent data
  suggested_project uuid, -- Suggested project for pairing (based on topic/rules)
  suggested_owner uuid, -- Suggested owner for pairing
  paired_node_id uuid, -- Reference to nodes table after pairing (optional tracking)
  status text not null default 'pending'::text, -- Status: pending, paired, ignored
  last_payload jsonb default '[]'::jsonb,
  foreign key (id_node_model) references public.node_models (id_node_model)
  match simple on update no action on delete set null,
  foreign key (paired_node_id) references public.nodes (id_node)
  match simple on update no action on delete set null,
  foreign key (suggested_owner) references public.owners (id_owner)
  match simple on update no action on delete set null,
  foreign key (suggested_project) references public.projects (id_project)
  match simple on update no action on delete set null
);
create unique index idx_node_unpaired_hardware on node_unpaired_devices using btree (hardware_id);
create index idx_node_unpaired_status on node_unpaired_devices using btree (status);
create index idx_node_unpaired_last_seen on node_unpaired_devices using btree (last_seen_at);
comment on column public.node_unpaired_devices.hardware_id is 'Unique hardware identifier: IMEI, dev_eui, MAC address, serial number';
comment on column public.node_unpaired_devices.id_node_model is 'Auto-detected or manually assigned node model';
comment on column public.node_unpaired_devices.last_topic is 'Last MQTT topic where data was received';
comment on column public.node_unpaired_devices.seen_count is 'Number of times this device has sent data';
comment on column public.node_unpaired_devices.suggested_project is 'Suggested project for pairing (based on topic/rules)';
comment on column public.node_unpaired_devices.suggested_owner is 'Suggested owner for pairing';
comment on column public.node_unpaired_devices.paired_node_id is 'Reference to nodes table after pairing (optional tracking)';
comment on column public.node_unpaired_devices.status is 'Status: pending, paired, ignored';

create table public.nodes (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_node uuid primary key not null default gen_random_uuid(),
  id_project uuid not null,
  id_node_model uuid not null,
  code text not null,
  serial_number text,
  dev_eui text,
  ip_address inet,
  install_date date,
  firmware_version text,
  battery_type text,
  telemetry_interval_sec integer default 300,
  connectivity_status text default 'offline'::text,
  last_seen_at timestamp with time zone,
  id_current_location uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  id_node_profile uuid, -- Assigned parsing profile for this node
  created_by uuid,
  updated_by uuid,
  name character varying(255), -- Friendly name for the node panel, e.g., "Panel DMA-01 Cikini"
  description text,
  address text,
  city character varying(100),
  province character varying(100),
  postal_code character varying(20),
  country character varying(100) default 'Indonesia',
  latitude numeric(10,8),
  longitude numeric(11,8),
  elevation_m numeric(8,2),
  status character varying(20) default 'active', -- active, inactive, maintenance, decommissioned
  commissioned_at timestamp with time zone,
  last_maintenance_at timestamp with time zone,
  next_maintenance_at timestamp with time zone,
  installation_type character varying(50), -- outdoor, indoor, underground, submerged
  enclosure_rating character varying(20),
  power_source character varying(50), -- solar, grid, battery, hybrid
  pic_name character varying(255),
  pic_phone character varying(50),
  pic_email character varying(255),
  notes text,
  tags text[], -- Array of tags for categorization
  icon_url text,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete no action,
  foreign key (id_current_location) references public.node_locations (id_node_location)
  match simple on update no action on delete no action,
  foreign key (id_node_model) references public.node_models (id_node_model)
  match simple on update no action on delete no action,
  foreign key (id_node_profile) references public.node_profiles (id_node_profile)
  match simple on update no action on delete set null,
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete cascade,
  foreign key (updated_by) references public.users (id_user)
  match simple on update no action on delete no action
);
create unique index nodes_id_project_code_key on nodes using btree (id_project, code);
create index idx_nodes_node_profile on nodes using btree (id_node_profile);
create index idx_nodes_created_by on nodes using btree (created_by);
create index idx_nodes_name on nodes using btree (name);
create index idx_nodes_status on nodes using btree (status);
create index idx_nodes_city on nodes using btree (city);
create index idx_nodes_province on nodes using btree (province);
create index idx_nodes_lat_lng on nodes using btree (latitude, longitude);
create index idx_nodes_tags on nodes using gin (tags);
comment on column public.nodes.id_node_profile is 'Assigned parsing profile for this node';
comment on column public.nodes.name is 'Friendly name for the node panel, e.g., "Panel DMA-01 Cikini"';
comment on column public.nodes.status is 'active, inactive, maintenance, decommissioned';
comment on column public.nodes.installation_type is 'outdoor, indoor, underground, submerged';
comment on column public.nodes.power_source is 'solar, grid, battery, hybrid';
comment on column public.nodes.tags is 'Array of tags for categorization';

create table public.nodes (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_node uuid primary key not null default gen_random_uuid(),
  id_project uuid not null,
  id_node_model uuid not null,
  code text not null,
  serial_number text,
  dev_eui text,
  ip_address inet,
  install_date date,
  firmware_version text,
  battery_type text,
  telemetry_interval_sec integer default 300,
  connectivity_status text default 'offline'::text,
  last_seen_at timestamp with time zone,
  id_current_location uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  id_node_profile uuid, -- Assigned parsing profile for this node
  created_by uuid,
  updated_by uuid,
  name character varying(255), -- Friendly name for the node panel, e.g., "Panel DMA-01 Cikini"
  description text,
  address text,
  city character varying(100),
  province character varying(100),
  postal_code character varying(20),
  country character varying(100) default 'Indonesia',
  latitude numeric(10,8),
  longitude numeric(11,8),
  elevation_m numeric(8,2),
  status character varying(20) default 'active', -- active, inactive, maintenance, decommissioned
  commissioned_at timestamp with time zone,
  last_maintenance_at timestamp with time zone,
  next_maintenance_at timestamp with time zone,
  installation_type character varying(50), -- outdoor, indoor, underground, submerged
  enclosure_rating character varying(20),
  power_source character varying(50), -- solar, grid, battery, hybrid
  pic_name character varying(255),
  pic_phone character varying(50),
  pic_email character varying(255),
  notes text,
  tags text[], -- Array of tags for categorization
  icon_url text,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete no action,
  foreign key (id_current_location) references public.node_locations (id_node_location)
  match simple on update no action on delete no action,
  foreign key (id_node_model) references public.node_models (id_node_model)
  match simple on update no action on delete no action,
  foreign key (id_node_profile) references public.node_profiles (id_node_profile)
  match simple on update no action on delete set null,
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete cascade,
  foreign key (updated_by) references public.users (id_user)
  match simple on update no action on delete no action
);
create unique index nodes_id_project_code_key on nodes using btree (id_project, code);
create index idx_nodes_node_profile on nodes using btree (id_node_profile);
create index idx_nodes_created_by on nodes using btree (created_by);
create index idx_nodes_name on nodes using btree (name);
create index idx_nodes_status on nodes using btree (status);
create index idx_nodes_city on nodes using btree (city);
create index idx_nodes_province on nodes using btree (province);
create index idx_nodes_lat_lng on nodes using btree (latitude, longitude);
create index idx_nodes_tags on nodes using gin (tags);
comment on column public.nodes.id_node_profile is 'Assigned parsing profile for this node';
comment on column public.nodes.name is 'Friendly name for the node panel, e.g., "Panel DMA-01 Cikini"';
comment on column public.nodes.status is 'active, inactive, maintenance, decommissioned';
comment on column public.nodes.installation_type is 'outdoor, indoor, underground, submerged';
comment on column public.nodes.power_source is 'solar, grid, battery, hybrid';
comment on column public.nodes.tags is 'Array of tags for categorization';

create table public.notification_channels (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_notification_channel uuid primary key not null default gen_random_uuid(),
  channel_name notification_channel_enum not null,
  is_enabled boolean default true,
  config jsonb, -- Channel-specific configuration (SMTP, SMS gateway, etc)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
comment on table public.notification_channels is 'Available notification delivery channels';
comment on column public.notification_channels.config is 'Channel-specific configuration (SMTP, SMS gateway, etc)';

create table public.notifications (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_notification uuid primary key not null default gen_random_uuid(),
  id_user uuid not null,
  id_notification_channel uuid,
  from_module character varying(100) not null, -- Source module: nodes, sensors, users, alerts, etc
  from_module_id uuid, -- ID of the source record that triggered notification
  type character varying(100) not null, -- Notification type: alert, info, warning, error, system
  title character varying(255) not null,
  message text not null,
  data jsonb, -- Additional context data in JSON format
  is_read boolean default false,
  read_at timestamp with time zone,
  sent_at timestamp with time zone,
  delivery_status character varying(50) default 'pending', -- Status: pending, sent, failed, read
  created_at timestamp with time zone default now(),
  foreign key (id_notification_channel) references public.notification_channels (id_notification_channel)
  match simple on update no action on delete no action,
  foreign key (id_user) references public.users (id_user)
  match simple on update no action on delete cascade
);
create index idx_notifications_id_user on notifications using btree (id_user);
create index idx_notifications_from_module on notifications using btree (from_module);
create index idx_notifications_from_module_id on notifications using btree (from_module_id);
create index idx_notifications_type on notifications using btree (type);
create index idx_notifications_is_read on notifications using btree (is_read);
create index idx_notifications_created_at on notifications using btree (created_at);
comment on table public.notifications is 'User notifications with dynamic source tracking';
comment on column public.notifications.from_module is 'Source module: nodes, sensors, users, alerts, etc';
comment on column public.notifications.from_module_id is 'ID of the source record that triggered notification';
comment on column public.notifications.type is 'Notification type: alert, info, warning, error, system';
comment on column public.notifications.data is 'Additional context data in JSON format';
comment on column public.notifications.delivery_status is 'Status: pending, sent, failed, read';

create table public.owner_forwarding_databases (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_owner_forwarding_db uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  label text not null,
  db_type text not null,
  host text not null,
  port integer not null,
  database_name text not null,
  username text not null,
  password_cipher text not null,
  target_schema text,
  target_table text not null,
  write_mode text default 'append'::text,
  batch_size integer default 100,
  enabled boolean default true,
  last_status text,
  last_delivery_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  source_type text, -- Source data type: sensor_logs (PG), sensor_telemetry (CH), sensor_channel_latest (CH)
  last_synced_id bigint default 0, -- Last synced ID for incremental sync (pg_sensor_log_id for telemetry)
  owner_code text, -- Owner code for filtering data (e.g., DEMO1 from device_id DEMO1-00D42390A994)
  last_synced_at timestamp with time zone, -- Timestamp of last successful sync
  sync_mode text default 'incremental'::text, -- Sync mode: incremental (track by ID) or full_replace (for latest tables)
  sync_interval_seconds integer default 60, -- Sync interval in seconds (default: 60 = 1 minute)
  connection_timeout_ms integer default 10000,
  query_timeout_ms integer default 30000,
  max_retries integer default 3,
  conflict_strategy text default 'ignore'::text, -- Conflict strategy: ignore (ON CONFLICT DO NOTHING), update (UPSERT), fail
  conflict_columns text[], -- Columns to detect conflict for UPSERT, e.g. {channel_id} or {id_sensor_log}
  auto_create_table boolean default false, -- Auto create target table if not exists
  is_running boolean default false,
  last_run_started_at timestamp with time zone,
  total_records_synced bigint default 0,
  total_sync_count integer default 0,
  total_error_count integer default 0,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade
);
create index idx_owner_forwarding_databases_owner on owner_forwarding_databases using btree (id_owner);
create index idx_owner_forwarding_databases_enabled on owner_forwarding_databases using btree (enabled) WHERE (enabled = true);
comment on column public.owner_forwarding_databases.source_type is 'Source data type: sensor_logs (PG), sensor_telemetry (CH), sensor_channel_latest (CH)';
comment on column public.owner_forwarding_databases.last_synced_id is 'Last synced ID for incremental sync (pg_sensor_log_id for telemetry)';
comment on column public.owner_forwarding_databases.owner_code is 'Owner code for filtering data (e.g., DEMO1 from device_id DEMO1-00D42390A994)';
comment on column public.owner_forwarding_databases.last_synced_at is 'Timestamp of last successful sync';
comment on column public.owner_forwarding_databases.sync_mode is 'Sync mode: incremental (track by ID) or full_replace (for latest tables)';
comment on column public.owner_forwarding_databases.sync_interval_seconds is 'Sync interval in seconds (default: 60 = 1 minute)';
comment on column public.owner_forwarding_databases.conflict_strategy is 'Conflict strategy: ignore (ON CONFLICT DO NOTHING), update (UPSERT), fail';
comment on column public.owner_forwarding_databases.conflict_columns is 'Columns to detect conflict for UPSERT, e.g. {channel_id} or {id_sensor_log}';
comment on column public.owner_forwarding_databases.auto_create_table is 'Auto create target table if not exists';

create table public.owner_forwarding_logs (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_owner_forwarding_log uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  config_type text not null,
  config_id uuid not null,
  status text not null,
  attempts integer default 1,
  error_message text,
  duration_ms integer,
  created_at timestamp with time zone default now(),
  records_read integer,
  records_inserted integer,
  records_skipped integer,
  from_id bigint,
  to_id bigint,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade
);
create index idx_owner_forwarding_logs_config on owner_forwarding_logs using btree (config_id, created_at);
create index idx_owner_forwarding_logs_owner on owner_forwarding_logs using btree (id_owner, created_at);

create table public.owner_forwarding_webhooks (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_owner_forwarding_webhook uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  label text not null,
  endpoint_url text not null,
  http_method text default 'POST'::text,
  headers_json jsonb,
  secret_token text,
  payload_template jsonb,
  max_retry integer default 3,
  retry_backoff_ms integer default 2000,
  enabled boolean default true,
  last_status text,
  last_delivery_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade
);

create table public.owners (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_owner uuid primary key not null default gen_random_uuid(),
  name text not null,
  industry text,
  contact_person text,
  sla_level text,
  forwarding_settings jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  email text, -- Owner email address for contact
  phone text, -- Owner phone number for contact
  address text, -- Owner physical address
  owner_code character varying(5) not null, -- Unique 5-digit owner identification code (auto-generated)
  created_by uuid,
  updated_by uuid,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete no action,
  foreign key (updated_by) references public.users (id_user)
  match simple on update no action on delete no action
);
create index idx_owners_email on owners using btree (email);
create index idx_owners_owner_code on owners using btree (owner_code);
create index idx_owners_created_by on owners using btree (created_by);
comment on column public.owners.email is 'Owner email address for contact';
comment on column public.owners.phone is 'Owner phone number for contact';
comment on column public.owners.address is 'Owner physical address';
comment on column public.owners.owner_code is 'Unique 5-digit owner identification code (auto-generated)';

create table public.password_reset_tokens (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_password_reset_token uuid primary key not null default gen_random_uuid(),
  id_user uuid not null,
  token character varying(255) not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  foreign key (id_user) references public.users (id_user)
  match simple on update no action on delete cascade
);
create unique index password_reset_tokens_token_key on password_reset_tokens using btree (token);
create index idx_password_reset_tokens_token on password_reset_tokens using btree (token);
create index idx_password_reset_tokens_id_user on password_reset_tokens using btree (id_user);
comment on table public.password_reset_tokens is 'Temporary tokens for password reset functionality';

create table public.projects (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_project uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  name text not null,
  area_type text,
  geofence jsonb,
  status text default 'active'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid,
  updated_by uuid,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete no action,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade,
  foreign key (updated_by) references public.users (id_user)
  match simple on update no action on delete no action
);
create index idx_projects_created_by on projects using btree (created_by);

create table public.report_templates (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id uuid primary key not null default gen_random_uuid(),
  id_owner uuid not null,
  id_user uuid,
  name character varying(100) not null,
  description character varying(500),
  config jsonb not null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade,
  foreign key (id_user) references public.users (id_user)
  match simple on update no action on delete set null
);
create index idx_report_templates_owner on report_templates using btree (id_owner);
create index idx_report_templates_user on report_templates using btree (id_user);
create index idx_report_templates_active on report_templates using btree (is_active);

create table public.sensor_catalogs (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_sensor_catalog uuid primary key not null default gen_random_uuid(),
  vendor text not null,
  model_name text not null,
  icon_asset text,
  icon_color text,
  datasheet_url text,
  firmware text,
  calibration_interval_days integer,
  default_channels_json jsonb,
  default_thresholds_json jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.sensor_channels (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_sensor_channel uuid primary key not null default gen_random_uuid(),
  id_sensor uuid not null,
  id_sensor_type uuid not null,
  metric_code text not null,
  unit text,
  min_threshold numeric,
  max_threshold numeric,
  multiplier numeric(12,6),
  offset_value numeric(12,6),
  register_address integer,
  precision numeric(6,3),
  aggregation text,
  alert_suppression_window integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_sensor) references public.sensors (id_sensor)
  match simple on update no action on delete cascade,
  foreign key (id_sensor_type) references public.sensor_types (id_sensor_type)
  match simple on update no action on delete no action
);
create unique index sensor_channels_id_sensor_metric_code_key on sensor_channels using btree (id_sensor, metric_code);

create table public.sensor_logs (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_sensor_log bigint primary key not null default nextval('sensor_logs_id_sensor_log_seq'::regclass),
  id_sensor_channel uuid not null,
  id_sensor uuid,
  id_node uuid,
  id_project uuid,
  id_owner uuid,
  ts timestamp with time zone not null,
  value_raw double precision,
  value_engineered double precision,
  quality_flag text,
  ingestion_source text,
  status_code integer,
  ingestion_latency_ms integer,
  payload_seq bigint,
  min_threshold double precision,
  max_threshold double precision,
  created_at timestamp with time zone default now(),
  foreign key (id_sensor_channel) references public.sensor_channels (id_sensor_channel)
  match simple on update no action on delete cascade
);
create index idx_sensor_logs_channel_ts on sensor_logs using btree (id_sensor_channel, ts);

create table public.sensor_types (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_sensor_type uuid primary key not null default gen_random_uuid(),
  category text not null,
  default_unit text,
  precision numeric(6,3),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  conversion_formula text -- JavaScript expression for converting raw value to engineered value. Use "x" as variable. Example: "(x - 0.5) * 10" or "Math.pow(x, 2) * 1.5"
);
comment on column public.sensor_types.conversion_formula is 'JavaScript expression for converting raw value to engineered value. Use "x" as variable. Example: "(x - 0.5) * 10" or "Math.pow(x, 2) * 1.5"';

create table public.sensors (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_sensor uuid primary key not null default gen_random_uuid(),
  id_node uuid not null,
  id_sensor_catalog uuid,
  label text not null,
  protocol_channel text,
  calibration_factor numeric(12,6),
  sampling_rate integer,
  install_date date,
  calibration_due_at date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  sensor_code text, -- Unique sensor identifier within a node (e.g., SENSOR-001)
  location text, -- Physical location description of the sensor (e.g., Tank A, Pipe Section 3)
  status text default 'active'::text, -- Sensor health status: active (operational), maintenance (under service), inactive (offline/disabled)
  created_by uuid,
  updated_by uuid,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete no action,
  foreign key (id_node) references public.nodes (id_node)
  match simple on update no action on delete cascade,
  foreign key (id_sensor_catalog) references public.sensor_catalogs (id_sensor_catalog)
  match simple on update no action on delete no action,
  foreign key (updated_by) references public.users (id_user)
  match simple on update no action on delete no action
);
create unique index idx_sensors_node_code on sensors using btree (id_node, sensor_code) WHERE (sensor_code IS NOT NULL);
create index idx_sensors_status on sensors using btree (status);
create index idx_sensors_created_by on sensors using btree (created_by);
comment on column public.sensors.sensor_code is 'Unique sensor identifier within a node (e.g., SENSOR-001)';
comment on column public.sensors.location is 'Physical location description of the sensor (e.g., Tank A, Pipe Section 3)';
comment on column public.sensors.status is 'Sensor health status: active (operational), maintenance (under service), inactive (offline/disabled)';

create table public.spatial_upload_file (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_upload uuid primary key not null default uuid_generate_v4(),
  id_owner uuid,
  original_filename character varying(500) not null,
  stored_filename character varying(500),
  file_path character varying(1000),
  file_size bigint default 0,
  file_type character varying(50),
  status character varying(20) default 'uploaded',
  parsed_result jsonb,
  field_mapping jsonb,
  error_message text,
  id_layer uuid,
  uploaded_by uuid,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  processed_at timestamp with time zone,
  foreign key (id_layer) references public.map_layer (id_layer)
  match simple on update no action on delete no action
);
create index idx_upload_owner on spatial_upload_file using btree (id_owner);
create index idx_upload_status on spatial_upload_file using btree (status);

create table public.spatial_upload_file (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_upload uuid primary key not null default uuid_generate_v4(),
  id_owner uuid,
  original_filename character varying(500) not null,
  stored_filename character varying(500),
  file_path character varying(1000),
  file_size bigint default 0,
  file_type character varying(50),
  status character varying(20) default 'uploaded',
  parsed_result jsonb,
  field_mapping jsonb,
  error_message text,
  id_layer uuid,
  uploaded_by uuid,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  processed_at timestamp with time zone,
  foreign key (id_layer) references public.map_layer (id_layer)
  match simple on update no action on delete no action
);
create index idx_upload_owner on spatial_upload_file using btree (id_owner);
create index idx_upload_status on spatial_upload_file using btree (status);

create table public.tenant_api_keys (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_api_key uuid primary key not null default gen_random_uuid(),
  id_user uuid not null,
  id_owner uuid not null,
  api_key_hash character varying(255) not null,
  api_key_prefix character varying(20) not null,
  label character varying(255),
  description text,
  rate_limit_plan character varying(20) default 'basic',
  is_active boolean default true,
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  requests_today integer default 0,
  requests_total bigint default 0,
  last_request_date date,
  ip_whitelist text[],
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade,
  foreign key (id_user) references public.users (id_user)
  match simple on update no action on delete cascade
);
create index idx_tenant_api_keys_prefix on tenant_api_keys using btree (api_key_prefix);
create index idx_tenant_api_keys_user on tenant_api_keys using btree (id_user);
create index idx_tenant_api_keys_owner on tenant_api_keys using btree (id_owner);
create index idx_tenant_api_keys_active on tenant_api_keys using btree (is_active) WHERE (is_active = true);

create table public.tenant_api_logs (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id bigint primary key not null default nextval('tenant_api_logs_id_seq'::regclass),
  id_api_key uuid,
  endpoint character varying(255) not null,
  method character varying(10) not null,
  status_code integer,
  response_time_ms integer,
  ip_address inet,
  user_agent text,
  request_params jsonb,
  error_message text,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  foreign key (id_api_key) references public.tenant_api_keys (id_api_key)
  match simple on update no action on delete set null
);
create index idx_tenant_api_logs_api_key on tenant_api_logs using btree (id_api_key);
create index idx_tenant_api_logs_created on tenant_api_logs using btree (created_at);

create table public.user_dashboards (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_dashboard uuid primary key not null default gen_random_uuid(),
  id_user uuid not null,
  id_project uuid,
  name text not null,
  description text,
  layout_type text default 'grid'::text,
  grid_cols integer default 4,
  is_default boolean default false,
  is_public boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (id_project) references public.projects (id_project)
  match simple on update no action on delete cascade
);
create index idx_user_dashboards_user on user_dashboards using btree (id_user);
create index idx_user_dashboards_project on user_dashboards using btree (id_project);

create table public.user_sessions (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_user_session uuid primary key not null default gen_random_uuid(),
  id_user uuid not null,
  token_hash character varying(255) not null, -- Hashed JWT token for revocation capability
  device_info jsonb, -- Browser, OS, device type extracted from user agent
  ip_address character varying(45),
  last_activity timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  foreign key (id_user) references public.users (id_user)
  match simple on update no action on delete cascade
);
create index idx_user_sessions_id_user on user_sessions using btree (id_user);
create index idx_user_sessions_token_hash on user_sessions using btree (token_hash);
create index idx_user_sessions_expires_at on user_sessions using btree (expires_at);
comment on table public.user_sessions is 'Active user sessions for security and session management';
comment on column public.user_sessions.token_hash is 'Hashed JWT token for revocation capability';
comment on column public.user_sessions.device_info is 'Browser, OS, device type extracted from user agent';

create table public.users (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_user uuid primary key not null default gen_random_uuid(),
  id_owner uuid, -- Link to owner - tenant users belong to an owner, admin users have NULL
  email character varying(255) not null,
  password character varying(255) not null,
  name character varying(255) not null,
  role character varying(50) default 'tenant', -- User role: admin (full access) or tenant (owner-scoped access)
  phone character varying(50),
  avatar_url character varying(500),
  is_active boolean default true, -- Account status - inactive users cannot login
  last_login_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid,
  updated_by uuid,
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete no action,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete set null,
  foreign key (updated_by) references public.users (id_user)
  match simple on update no action on delete no action
);
create unique index users_email_key on users using btree (email);
create index idx_users_email on users using btree (email);
create index idx_users_id_owner on users using btree (id_owner);
create index idx_users_role on users using btree (role);
create index idx_users_is_active on users using btree (is_active);
comment on table public.users is 'Default admin user created. Email: admin@iot.local, Password: admin123 (CHANGE THIS!)';
comment on column public.users.id_owner is 'Link to owner - tenant users belong to an owner, admin users have NULL';
comment on column public.users.role is 'User role: admin (full access) or tenant (owner-scoped access)';
comment on column public.users.is_active is 'Account status - inactive users cannot login';

create table public.widget_query_templates (
  tableoid oid not null,
  cmax cid not null,
  xmax xid not null,
  cmin cid not null,
  xmin xid not null,
  ctid tid not null,
  id_template uuid primary key not null default gen_random_uuid(),
  id_owner uuid,
  name character varying(255) not null,
  description text,
  sql_template text not null,
  widget_type character varying(50),
  default_config jsonb default '{}'::jsonb,
  is_system boolean default false,
  is_active boolean default true,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  foreign key (created_by) references public.users (id_user)
  match simple on update no action on delete set null,
  foreign key (id_owner) references public.owners (id_owner)
  match simple on update no action on delete cascade
);
create index idx_widget_templates_owner on widget_query_templates using btree (id_owner);
comment on table public.widget_query_templates is 'Reusable SQL query templates for widgets';

