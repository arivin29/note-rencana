create type log_label_enum as enum ('info', 'log', 'pairing', 'error', 'warning', 'debug', 'telemetry', 'command', 'response');

alter type log_label_enum owner to postgres;

create table migrations
(
    id        serial
        constraint "PK_8c82d7f526340ab734260ea46be"
            primary key,
    timestamp bigint  not null,
    name      varchar not null
);

alter table migrations
    owner to postgres;

create table owners
(
    id_owner            uuid                     default gen_random_uuid() not null
        primary key,
    name                text                                               not null,
    industry            text,
    contact_person      text,
    sla_level           text,
    forwarding_settings jsonb,
    created_at          timestamp with time zone default now(),
    updated_at          timestamp with time zone default now(),
    email               text,
    phone               text,
    address             text
);

comment on column owners.email is 'Owner email address for contact';

comment on column owners.phone is 'Owner phone number for contact';

comment on column owners.address is 'Owner physical address';

alter table owners
    owner to postgres;

create index idx_owners_email
    on owners (email);

create table projects
(
    id_project uuid                     default gen_random_uuid() not null
        primary key,
    id_owner   uuid                                               not null
        references owners
            on delete cascade,
    name       text                                               not null,
    area_type  text,
    geofence   jsonb,
    status     text                     default 'active'::text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

alter table projects
    owner to postgres;

create table node_locations
(
    id_node_location uuid                     default gen_random_uuid() not null
        primary key,
    id_project       uuid                                               not null
        references projects
            on delete cascade,
    type             text                     default 'manual'::text
        constraint node_locations_type_check
            check (type = ANY (ARRAY ['manual'::text, 'gps'::text, 'import'::text])),
    coordinates      point                                              not null,
    elevation        numeric(6, 2),
    address          text,
    precision_m      numeric(6, 2),
    source           text,
    created_at       timestamp with time zone default now(),
    updated_at       timestamp with time zone default now()
);

alter table node_locations
    owner to postgres;

create table node_models
(
    id_node_model      uuid                     default gen_random_uuid() not null
        primary key,
    model_code         text
        unique,
    vendor             text                                               not null,
    model_name         text                                               not null,
    protocol           text                                               not null,
    communication_band text,
    power_type         text,
    hardware_class     text,
    hardware_revision  text,
    toolchain          text,
    build_agent        text,
    firmware_repo      text,
    flash_protocol     text,
    supports_codegen   boolean                  default false,
    default_firmware   text,
    created_at         timestamp with time zone default now(),
    updated_at         timestamp with time zone default now()
);

alter table node_models
    owner to postgres;

create table sensor_types
(
    id_sensor_type uuid                     default gen_random_uuid() not null
        primary key,
    category       text                                               not null,
    default_unit   text,
    precision      numeric(6, 3),
    created_at     timestamp with time zone default now(),
    updated_at     timestamp with time zone default now()
);

alter table sensor_types
    owner to postgres;

create table sensor_catalogs
(
    id_sensor_catalog         uuid                     default gen_random_uuid() not null
        primary key,
    vendor                    text                                               not null,
    model_name                text                                               not null,
    icon_asset                text,
    icon_color                text,
    datasheet_url             text,
    firmware                  text,
    calibration_interval_days integer,
    default_channels_json     jsonb,
    default_thresholds_json   jsonb,
    created_at                timestamp with time zone default now(),
    updated_at                timestamp with time zone default now()
);

alter table sensor_catalogs
    owner to postgres;

create table user_dashboards
(
    id_dashboard uuid                     default gen_random_uuid() not null
        primary key,
    id_user      uuid                                               not null,
    id_project   uuid
        references projects
            on delete cascade,
    name         text                                               not null,
    description  text,
    layout_type  text                     default 'grid'::text,
    grid_cols    integer                  default 4,
    is_default   boolean                  default false,
    is_public    boolean                  default false,
    created_at   timestamp with time zone default now(),
    updated_at   timestamp with time zone default now()
);

alter table user_dashboards
    owner to postgres;

create index idx_user_dashboards_user
    on user_dashboards (id_user);

create index idx_user_dashboards_project
    on user_dashboards (id_project);

create table owner_forwarding_webhooks
(
    id_owner_forwarding_webhook uuid                     default gen_random_uuid() not null
        primary key,
    id_owner                    uuid                                               not null
        references owners
            on delete cascade,
    label                       text                                               not null,
    endpoint_url                text                                               not null,
    http_method                 text                     default 'POST'::text,
    headers_json                jsonb,
    secret_token                text,
    payload_template            jsonb,
    max_retry                   integer                  default 3,
    retry_backoff_ms            integer                  default 2000,
    enabled                     boolean                  default true,
    last_status                 text,
    last_delivery_at            timestamp with time zone,
    last_error                  text,
    created_at                  timestamp with time zone default now(),
    updated_at                  timestamp with time zone default now()
);

alter table owner_forwarding_webhooks
    owner to postgres;

create table owner_forwarding_databases
(
    id_owner_forwarding_db uuid                     default gen_random_uuid() not null
        primary key,
    id_owner               uuid                                               not null
        references owners
            on delete cascade,
    label                  text                                               not null,
    db_type                text                                               not null
        constraint owner_forwarding_databases_db_type_check
            check (db_type = ANY (ARRAY ['mysql'::text, 'postgres'::text])),
    host                   text                                               not null,
    port                   integer                                            not null,
    database_name          text                                               not null,
    username               text                                               not null,
    password_cipher        text                                               not null,
    target_schema          text,
    target_table           text                                               not null,
    write_mode             text                     default 'append'::text,
    batch_size             integer                  default 100,
    enabled                boolean                  default true,
    last_status            text,
    last_delivery_at       timestamp with time zone,
    last_error             text,
    created_at             timestamp with time zone default now(),
    updated_at             timestamp with time zone default now()
);

alter table owner_forwarding_databases
    owner to postgres;

create table owner_forwarding_logs
(
    id_owner_forwarding_log uuid                     default gen_random_uuid() not null
        primary key,
    id_owner                uuid                                               not null
        references owners
            on delete cascade,
    config_type             text                                               not null
        constraint owner_forwarding_logs_config_type_check
            check (config_type = ANY (ARRAY ['webhook'::text, 'database'::text])),
    config_id               uuid                                               not null,
    status                  text                                               not null,
    attempts                integer                  default 1,
    error_message           text,
    duration_ms             integer,
    created_at              timestamp with time zone default now()
);

alter table owner_forwarding_logs
    owner to postgres;

create table node_profiles
(
    id_node_profile  uuid                     default gen_random_uuid() not null
        primary key,
    id_node_model    uuid                                               not null
        references node_models
            on delete cascade,
    id_project       uuid
                                                                        references projects
                                                                            on delete set null,
    code             text                                               not null,
    name             text                                               not null,
    description      text,
    parser_type      text                                               not null,
    mapping_json     jsonb                                              not null,
    transform_script text,
    enabled          boolean                  default true,
    created_at       timestamp with time zone default now(),
    updated_at       timestamp with time zone default now(),
    unique (id_node_model, code)
);

comment on table node_profiles is 'Payload parsing profiles for different node models';

comment on column node_profiles.parser_type is 'Parser type: json_path, lorawan, modbus, etc.';

comment on column node_profiles.mapping_json is 'JSON mapping configuration for parsing payloads to sensor channels';

alter table node_profiles
    owner to postgres;

create table nodes
(
    id_node                uuid                     default gen_random_uuid() not null
        primary key,
    id_project             uuid                                               not null
        references projects
            on delete cascade,
    id_node_model          uuid                                               not null
        references node_models,
    code                   text                                               not null,
    serial_number          text,
    dev_eui                text,
    ip_address             inet,
    install_date           date,
    firmware_version       text,
    battery_type           text,
    telemetry_interval_sec integer                  default 300,
    connectivity_status    text                     default 'offline'::text,
    last_seen_at           timestamp with time zone,
    id_current_location    uuid
        references node_locations,
    created_at             timestamp with time zone default now(),
    updated_at             timestamp with time zone default now(),
    id_node_profile        uuid
                                                                              references node_profiles
                                                                                  on delete set null,
    unique (id_project, code)
);

comment on column nodes.id_node_profile is 'Assigned parsing profile for this node';

alter table nodes
    owner to postgres;

create index idx_nodes_node_profile
    on nodes (id_node_profile);

create table node_assignments
(
    id_node_assignment uuid                     default gen_random_uuid() not null
        primary key,
    id_node            uuid                                               not null
        references nodes
            on delete cascade,
    id_project         uuid                                               not null
        references projects,
    id_owner           uuid                                               not null
        references owners,
    id_node_location   uuid
        references node_locations,
    start_at           timestamp with time zone                           not null,
    end_at             timestamp with time zone,
    reason             text,
    assigned_by        uuid,
    ticket_ref         text,
    created_at         timestamp with time zone default now(),
    updated_at         timestamp with time zone default now()
);

alter table node_assignments
    owner to postgres;

create table sensors
(
    id_sensor          uuid                     default gen_random_uuid() not null
        primary key,
    id_node            uuid                                               not null
        references nodes
            on delete cascade,
    id_sensor_catalog  uuid
        references sensor_catalogs,
    label              text                                               not null,
    protocol_channel   text,
    calibration_factor numeric(12, 6),
    sampling_rate      integer,
    install_date       date,
    calibration_due_at date,
    created_at         timestamp with time zone default now(),
    updated_at         timestamp with time zone default now(),
    sensor_code        text,
    location           text,
    status             text                     default 'active'::text
        constraint sensors_status_check
            check (status = ANY (ARRAY ['active'::text, 'maintenance'::text, 'inactive'::text]))
);

comment on column sensors.sensor_code is 'Unique sensor identifier within a node (e.g., SENSOR-001)';

comment on column sensors.location is 'Physical location description of the sensor (e.g., Tank A, Pipe Section 3)';

comment on column sensors.status is 'Sensor health status: active (operational), maintenance (under service), inactive (offline/disabled)';

alter table sensors
    owner to postgres;

create unique index idx_sensors_node_code
    on sensors (id_node, sensor_code)
    where (sensor_code IS NOT NULL);

create index idx_sensors_status
    on sensors (status);

create table sensor_channels
(
    id_sensor_channel        uuid                     default gen_random_uuid() not null
        primary key,
    id_sensor                uuid                                               not null
        references sensors
            on delete cascade,
    id_sensor_type           uuid                                               not null
        references sensor_types,
    metric_code              text                                               not null,
    unit                     text,
    min_threshold            numeric,
    max_threshold            numeric,
    multiplier               numeric(12, 6),
    offset_value             numeric(12, 6),
    register_address         integer,
    precision                numeric(6, 3),
    aggregation              text,
    alert_suppression_window integer,
    created_at               timestamp with time zone default now(),
    updated_at               timestamp with time zone default now(),
    unique (id_sensor, metric_code)
);

alter table sensor_channels
    owner to postgres;

create table sensor_logs
(
    id_sensor_log        bigserial
        primary key,
    id_sensor_channel    uuid                     not null
        references sensor_channels
            on delete cascade,
    id_sensor            uuid,
    id_node              uuid,
    id_project           uuid,
    id_owner             uuid,
    ts                   timestamp with time zone not null,
    value_raw            double precision,
    value_engineered     double precision,
    quality_flag         text,
    ingestion_source     text,
    status_code          integer,
    ingestion_latency_ms integer,
    payload_seq          bigint,
    min_threshold        double precision,
    max_threshold        double precision,
    created_at           timestamp with time zone default now()
);

alter table sensor_logs
    owner to postgres;

create index idx_sensor_logs_channel_ts
    on sensor_logs (id_sensor_channel asc, ts desc);

create table alert_rules
(
    id_alert_rule     uuid                     default gen_random_uuid() not null
        primary key,
    id_sensor_channel uuid                                               not null
        references sensor_channels
            on delete cascade,
    rule_type         text                                               not null,
    severity          text,
    params_json       jsonb,
    enabled           boolean                  default true,
    created_at        timestamp with time zone default now(),
    updated_at        timestamp with time zone default now()
);

alter table alert_rules
    owner to postgres;

create table alert_events
(
    id_alert_event  uuid                     default gen_random_uuid() not null
        primary key,
    id_alert_rule   uuid                                               not null
        references alert_rules
            on delete cascade,
    triggered_at    timestamp with time zone                           not null,
    value           double precision,
    status          text                     default 'open'::text,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    cleared_by      uuid,
    cleared_at      timestamp with time zone,
    note            text,
    created_at      timestamp with time zone default now(),
    updated_at      timestamp with time zone default now()
);

alter table alert_events
    owner to postgres;

create table dashboard_widgets
(
    id_widget_instance uuid                     default gen_random_uuid() not null
        primary key,
    id_dashboard       uuid                                               not null
        references user_dashboards
            on delete cascade,
    widget_type        text                                               not null,
    id_sensor          uuid
        references sensors
            on delete cascade,
    id_sensor_channel  uuid
        references sensor_channels
            on delete cascade,
    position_x         integer                  default 0,
    position_y         integer                  default 0,
    size_width         integer                  default 1,
    size_height        integer                  default 1,
    config_json        jsonb,
    refresh_rate       integer                  default 5,
    display_order      integer,
    created_at         timestamp with time zone default now(),
    updated_at         timestamp with time zone default now()
);

alter table dashboard_widgets
    owner to postgres;

create index idx_dashboard_widgets_dashboard
    on dashboard_widgets (id_dashboard);

create index idx_dashboard_widgets_sensor
    on dashboard_widgets (id_sensor);

create table node_unpaired_devices
(
    id_node_unpaired_device uuid                     default gen_random_uuid() not null
        constraint "PK_730e8a5501e7a0add123574c6dc"
            primary key,
    hardware_id             text                                               not null,
    id_node_model           uuid
        constraint fk_node_unpaired_node_model
            references node_models
            on delete set null,
    first_seen_at           timestamp with time zone default now()             not null,
    last_seen_at            timestamp with time zone default now()             not null,
    last_payload            jsonb,
    last_topic              text,
    seen_count              integer                  default 1                 not null,
    suggested_project       uuid
        constraint fk_node_unpaired_suggested_project
            references projects
            on delete set null,
    suggested_owner         uuid
        constraint fk_node_unpaired_suggested_owner
            references owners
            on delete set null,
    paired_node_id          uuid
        constraint fk_node_unpaired_paired_node
            references nodes
            on delete set null,
    status                  text                     default 'pending'::text   not null
);

comment on column node_unpaired_devices.hardware_id is 'Unique hardware identifier: IMEI, dev_eui, MAC address, serial number';

comment on column node_unpaired_devices.id_node_model is 'Auto-detected or manually assigned node model';

comment on column node_unpaired_devices.last_payload is 'Last received raw payload from device';

comment on column node_unpaired_devices.last_topic is 'Last MQTT topic where data was received';

comment on column node_unpaired_devices.seen_count is 'Number of times this device has sent data';

comment on column node_unpaired_devices.suggested_project is 'Suggested project for pairing (based on topic/rules)';

comment on column node_unpaired_devices.suggested_owner is 'Suggested owner for pairing';

comment on column node_unpaired_devices.paired_node_id is 'Reference to nodes table after pairing (optional tracking)';

comment on column node_unpaired_devices.status is 'Status: pending, paired, ignored';

alter table node_unpaired_devices
    owner to postgres;

create unique index idx_node_unpaired_hardware
    on node_unpaired_devices (hardware_id);

create index idx_node_unpaired_status
    on node_unpaired_devices (status);

create index idx_node_unpaired_last_seen
    on node_unpaired_devices (last_seen_at);

create index idx_node_profiles_node_model
    on node_profiles (id_node_model);

create index idx_node_profiles_project
    on node_profiles (id_project);

create table iot_log
(
    id         uuid           default uuid_generate_v4()    not null
        constraint "PK_e75a3f71d2554eb0dd763a70f66"
            primary key,
    label      log_label_enum default 'log'::log_label_enum not null,
    topic      varchar(500),
    payload    jsonb                                        not null,
    device_id  varchar(255),
    timestamp  timestamp                                    not null,
    processed  boolean        default false                 not null,
    notes      text,
    created_at timestamp      default CURRENT_TIMESTAMP     not null,
    updated_at timestamp      default CURRENT_TIMESTAMP     not null
);

alter table iot_log
    owner to postgres;

create index "IDX_iot_log_label"
    on iot_log (label);

create index "IDX_iot_log_device_id"
    on iot_log (device_id);

create index "IDX_iot_log_processed"
    on iot_log (processed);

create index "IDX_iot_log_created_at"
    on iot_log (created_at);

create index "IDX_iot_log_timestamp"
    on iot_log (timestamp);

create function uuid_nil() returns uuid
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_nil() owner to postgres;

create function uuid_ns_dns() returns uuid
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_ns_dns() owner to postgres;

create function uuid_ns_url() returns uuid
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_ns_url() owner to postgres;

create function uuid_ns_oid() returns uuid
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_ns_oid() owner to postgres;

create function uuid_ns_x500() returns uuid
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_ns_x500() owner to postgres;

create function uuid_generate_v1() returns uuid
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_generate_v1() owner to postgres;

create function uuid_generate_v1mc() returns uuid
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_generate_v1mc() owner to postgres;

create function uuid_generate_v3(namespace uuid, name text) returns uuid
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_generate_v3(uuid, text) owner to postgres;

create function uuid_generate_v4() returns uuid
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_generate_v4() owner to postgres;

create function uuid_generate_v5(namespace uuid, name text) returns uuid
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function uuid_generate_v5(uuid, text) owner to postgres;

create function digest(text, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function digest(text, text) owner to postgres;

create function digest(bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function digest(bytea, text) owner to postgres;

create function hmac(text, text, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function hmac(text, text, text) owner to postgres;

create function hmac(bytea, bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function hmac(bytea, bytea, text) owner to postgres;

create function crypt(text, text) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function crypt(text, text) owner to postgres;

create function gen_salt(text) returns text
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function gen_salt(text) owner to postgres;

create function gen_salt(text, integer) returns text
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function gen_salt(text, integer) owner to postgres;

create function encrypt(bytea, bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function encrypt(bytea, bytea, text) owner to postgres;

create function decrypt(bytea, bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function decrypt(bytea, bytea, text) owner to postgres;

create function encrypt_iv(bytea, bytea, bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function encrypt_iv(bytea, bytea, bytea, text) owner to postgres;

create function decrypt_iv(bytea, bytea, bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function decrypt_iv(bytea, bytea, bytea, text) owner to postgres;

create function gen_random_bytes(integer) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function gen_random_bytes(integer) owner to postgres;

create function gen_random_uuid() returns uuid
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function gen_random_uuid() owner to postgres;

create function pgp_sym_encrypt(text, text) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_encrypt(text, text) owner to postgres;

create function pgp_sym_encrypt_bytea(bytea, text) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_encrypt_bytea(bytea, text) owner to postgres;

create function pgp_sym_encrypt(text, text, text) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_encrypt(text, text, text) owner to postgres;

create function pgp_sym_encrypt_bytea(bytea, text, text) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_encrypt_bytea(bytea, text, text) owner to postgres;

create function pgp_sym_decrypt(bytea, text) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_decrypt(bytea, text) owner to postgres;

create function pgp_sym_decrypt_bytea(bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_decrypt_bytea(bytea, text) owner to postgres;

create function pgp_sym_decrypt(bytea, text, text) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_decrypt(bytea, text, text) owner to postgres;

create function pgp_sym_decrypt_bytea(bytea, text, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_sym_decrypt_bytea(bytea, text, text) owner to postgres;

create function pgp_pub_encrypt(text, bytea) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_encrypt(text, bytea) owner to postgres;

create function pgp_pub_encrypt_bytea(bytea, bytea) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_encrypt_bytea(bytea, bytea) owner to postgres;

create function pgp_pub_encrypt(text, bytea, text) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_encrypt(text, bytea, text) owner to postgres;

create function pgp_pub_encrypt_bytea(bytea, bytea, text) returns bytea
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_encrypt_bytea(bytea, bytea, text) owner to postgres;

create function pgp_pub_decrypt(bytea, bytea) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_decrypt(bytea, bytea) owner to postgres;

create function pgp_pub_decrypt_bytea(bytea, bytea) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_decrypt_bytea(bytea, bytea) owner to postgres;

create function pgp_pub_decrypt(bytea, bytea, text) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_decrypt(bytea, bytea, text) owner to postgres;

create function pgp_pub_decrypt_bytea(bytea, bytea, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_decrypt_bytea(bytea, bytea, text) owner to postgres;

create function pgp_pub_decrypt(bytea, bytea, text, text) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_decrypt(bytea, bytea, text, text) owner to postgres;

create function pgp_pub_decrypt_bytea(bytea, bytea, text, text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_pub_decrypt_bytea(bytea, bytea, text, text) owner to postgres;

create function pgp_key_id(bytea) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function pgp_key_id(bytea) owner to postgres;

create function armor(bytea) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function armor(bytea) owner to postgres;

create function armor(bytea, text[], text[]) returns text
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function armor(bytea, text[], text[]) owner to postgres;

create function dearmor(text) returns bytea
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;
$$;

alter function dearmor(text) owner to postgres;

create function pgp_armor_headers(text, out key text, out value text) returns setof setof record
    immutable
    strict
    parallel safe
    language c
as
$$
begin
-- missing source code
end;

$$;

alter function pgp_armor_headers(text, out text, out text) owner to postgres;

