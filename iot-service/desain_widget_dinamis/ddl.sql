create table public.custom_dashboards
(
    id_dashboard     uuid                     default gen_random_uuid() not null
        primary key,
    id_owner         uuid                                               not null
        references public.owners
            on delete cascade,
    name             varchar(255)                                       not null,
    description      text,
    layout_config    jsonb                    default '{}'::jsonb,
    time_range       varchar(20)              default '6h'::character varying,
    refresh_interval integer                  default 60,
    is_default       boolean                  default false,
    is_active        boolean                  default true,
    created_by       uuid
                                                                        references public.users
                                                                            on delete set null,
    created_at       timestamp with time zone default now(),
    updated_at       timestamp with time zone default now()
);

comment on table public.custom_dashboards is 'Custom dashboards with SQL-based widgets';

alter table public.custom_dashboards
    owner to postgres;

create index idx_custom_dashboards_owner
    on public.custom_dashboards (id_owner);

create index idx_custom_dashboards_created_by
    on public.custom_dashboards (created_by);

create table public.custom_widgets
(
    id_widget    uuid                     default gen_random_uuid() not null
        primary key,
    id_dashboard uuid                                               not null
        references public.custom_dashboards
            on delete cascade,
    name         varchar(255)                                       not null,
    widget_type  varchar(50)                                        not null,
    position_x   integer                  default 0,
    position_y   integer                  default 0,
    cols         integer                  default 6,
    rows         integer                  default 4,
    sql_query    text                                               not null,
    data_source  varchar(20)              default 'postgresql'::character varying,
    config       jsonb                    default '{}'::jsonb       not null,
    is_active    boolean                  default true,
    created_by   uuid
                                                                    references public.users
                                                                        on delete set null,
    created_at   timestamp with time zone default now(),
    updated_at   timestamp with time zone default now(),
    constraint chk_data_source check (data_source IN ('postgresql', 'clickhouse'))
);

comment on table public.custom_widgets is 'Widgets with custom SQL queries and configurations';

comment on column public.custom_widgets.widget_type is 'line-chart, bar-chart, gauge, pie-chart, value-card, data-table';

comment on column public.custom_widgets.sql_query is 'SELECT query only - validated before execution';

comment on column public.custom_widgets.data_source is 'Data source for query execution: postgresql or clickhouse';

comment on column public.custom_widgets.config is 'JSON config: mapping, series, xAxis, yAxis, thresholds, display';

alter table public.custom_widgets
    owner to postgres;

create index idx_custom_widgets_dashboard
    on public.custom_widgets (id_dashboard);

create index idx_custom_widgets_type
    on public.custom_widgets (widget_type);

create index idx_custom_widgets_data_source
    on public.custom_widgets (data_source);

