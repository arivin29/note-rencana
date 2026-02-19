create table public.projects
(
    id_project uuid                     default gen_random_uuid() not null
        primary key,
    id_owner   uuid                                               not null
        references public.owners
            on delete cascade,
    name       text                                               not null,
    area_type  text,
    geofence   jsonb,
    status     text                     default 'active'::text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    created_by uuid
        references public.users,
    updated_by uuid
        references public.users
);

alter table public.projects
    owner to postgres;

create index idx_projects_created_by
    on public.projects (created_by);

create table public.nodes
(
    id_node                uuid                     default gen_random_uuid() not null
        primary key,
    id_project             uuid                                               not null
        references public.projects
            on delete cascade,
    id_node_model          uuid                                               not null
        references public.node_models,
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
        references public.node_locations,
    created_at             timestamp with time zone default now(),
    updated_at             timestamp with time zone default now(),
    id_node_profile        uuid
                                                                              references public.node_profiles
                                                                                  on delete set null,
    created_by             uuid
        references public.users,
    updated_by             uuid
        references public.users,
    name                   varchar(255),
    description            text,
    address                text,
    city                   varchar(100),
    province               varchar(100),
    postal_code            varchar(20),
    country                varchar(100)             default 'Indonesia'::character varying,
    latitude               numeric(10, 8),
    longitude              numeric(11, 8),
    elevation_m            numeric(8, 2),
    status                 varchar(20)              default 'active'::character varying,
    commissioned_at        timestamp with time zone,
    last_maintenance_at    timestamp with time zone,
    next_maintenance_at    timestamp with time zone,
    installation_type      varchar(50),
    enclosure_rating       varchar(20),
    power_source           varchar(50),
    pic_name               varchar(255),
    pic_phone              varchar(50),
    pic_email              varchar(255),
    notes                  text,
    tags                   text[],
    unique (id_project, code)
);

comment on column public.nodes.id_node_profile is 'Assigned parsing profile for this node';

comment on column public.nodes.name is 'Friendly name for the node panel, e.g., "Panel DMA-01 Cikini"';

comment on column public.nodes.status is 'active, inactive, maintenance, decommissioned';

comment on column public.nodes.installation_type is 'outdoor, indoor, underground, submerged';

comment on column public.nodes.power_source is 'solar, grid, battery, hybrid';

comment on column public.nodes.tags is 'Array of tags for categorization';

alter table public.nodes
    owner to postgres;

create index idx_nodes_node_profile
    on public.nodes (id_node_profile);

create index idx_nodes_created_by
    on public.nodes (created_by);

create index idx_nodes_name
    on public.nodes (name);

create index idx_nodes_status
    on public.nodes (status);

create index idx_nodes_city
    on public.nodes (city);

create index idx_nodes_province
    on public.nodes (province);

create index idx_nodes_lat_lng
    on public.nodes (latitude, longitude);

create index idx_nodes_tags
    on public.nodes using gin (tags);

create table public.sensor_types
(
    id_sensor_type     uuid                     default gen_random_uuid() not null
        primary key,
    category           text                                               not null,
    default_unit       text,
    precision          numeric(6, 3),
    created_at         timestamp with time zone default now(),
    updated_at         timestamp with time zone default now(),
    conversion_formula text
);

comment on column public.sensor_types.conversion_formula is 'JavaScript expression for converting raw value to engineered value. Use "x" as variable. Example: "(x - 0.5) * 10" or "Math.pow(x, 2) * 1.5"';

alter table public.sensor_types
    owner to postgres;

create table public.sensor_catalogs
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

alter table public.sensor_catalogs
    owner to postgres;

create table public.sensors
(
    id_sensor          uuid                     default gen_random_uuid() not null
        primary key,
    id_node            uuid                                               not null
        references public.nodes
            on delete cascade,
    id_sensor_catalog  uuid
        references public.sensor_catalogs,
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
            check (status = ANY (ARRAY ['active'::text, 'maintenance'::text, 'inactive'::text])),
    created_by         uuid
        references public.users,
    updated_by         uuid
        references public.users
);

comment on column public.sensors.sensor_code is 'Unique sensor identifier within a node (e.g., SENSOR-001)';

comment on column public.sensors.location is 'Physical location description of the sensor (e.g., Tank A, Pipe Section 3)';

comment on column public.sensors.status is 'Sensor health status: active (operational), maintenance (under service), inactive (offline/disabled)';

alter table public.sensors
    owner to postgres;

create unique index idx_sensors_node_code
    on public.sensors (id_node, sensor_code)
    where (sensor_code IS NOT NULL);

create index idx_sensors_status
    on public.sensors (status);

create index idx_sensors_created_by
    on public.sensors (created_by);

create table public.sensor_channels
(
    id_sensor_channel        uuid                     default gen_random_uuid() not null
        primary key,
    id_sensor                uuid                                               not null
        references public.sensors
            on delete cascade,
    id_sensor_type           uuid                                               not null
        references public.sensor_types,
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

alter table public.sensor_channels
    owner to postgres;

create table public.sensor_logs
(
    id_sensor_log        bigserial
        primary key,
    id_sensor_channel    uuid                     not null
        references public.sensor_channels
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

alter table public.sensor_logs
    owner to postgres;

create index idx_sensor_logs_channel_ts
    on public.sensor_logs (id_sensor_channel asc, ts desc);

