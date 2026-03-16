import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScadaTables1763200000000 implements MigrationInterface {
  name = 'CreateScadaTables1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scada_diagrams" (
        "id_scada_diagram" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_owner" UUID NOT NULL REFERENCES "owners"("id_owner") ON DELETE CASCADE,
        "id_project" UUID REFERENCES "projects"("id_project") ON DELETE SET NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "diagram_code" VARCHAR(100),
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "canvas_config" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "runtime_config" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_by" UUID REFERENCES "users"("id_user") ON DELETE SET NULL,
        "updated_by" UUID REFERENCES "users"("id_user") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_diagrams_owner"
      ON "scada_diagrams" ("id_owner")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_diagrams_project"
      ON "scada_diagrams" ("id_project")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_diagrams_status"
      ON "scada_diagrams" ("status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_scada_diagrams_owner_code"
      ON "scada_diagrams" ("id_owner", "diagram_code")
      WHERE "diagram_code" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scada_nodes" (
        "id_scada_node" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_scada_diagram" UUID NOT NULL REFERENCES "scada_diagrams"("id_scada_diagram") ON DELETE CASCADE,
        "node_type" VARCHAR(50) NOT NULL,
        "label" VARCHAR(255) NOT NULL,
        "position_x" DOUBLE PRECISION NOT NULL,
        "position_y" DOUBLE PRECISION NOT NULL,
        "width" DOUBLE PRECISION NOT NULL,
        "height" DOUBLE PRECISION NOT NULL,
        "rotation_deg" DOUBLE PRECISION,
        "z_index" INTEGER NOT NULL DEFAULT 0,
        "id_related_node" UUID REFERENCES "nodes"("id_node") ON DELETE SET NULL,
        "id_related_sensor" UUID REFERENCES "sensors"("id_sensor") ON DELETE SET NULL,
        "style_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "config_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_nodes_diagram"
      ON "scada_nodes" ("id_scada_diagram")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_nodes_type"
      ON "scada_nodes" ("node_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_nodes_related_node"
      ON "scada_nodes" ("id_related_node")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_nodes_related_sensor"
      ON "scada_nodes" ("id_related_sensor")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scada_edges" (
        "id_scada_edge" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_scada_diagram" UUID NOT NULL REFERENCES "scada_diagrams"("id_scada_diagram") ON DELETE CASCADE,
        "source_node_id" UUID NOT NULL REFERENCES "scada_nodes"("id_scada_node") ON DELETE CASCADE,
        "target_node_id" UUID NOT NULL REFERENCES "scada_nodes"("id_scada_node") ON DELETE CASCADE,
        "edge_type" VARCHAR(50) NOT NULL DEFAULT 'pipe',
        "label" VARCHAR(255),
        "pipe_type" VARCHAR(20),
        "flow_direction" VARCHAR(20),
        "animated" BOOLEAN NOT NULL DEFAULT false,
        "style_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "config_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_edges_diagram"
      ON "scada_edges" ("id_scada_diagram")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_edges_source"
      ON "scada_edges" ("source_node_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_edges_target"
      ON "scada_edges" ("target_node_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_edges_source_target"
      ON "scada_edges" ("source_node_id", "target_node_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scada_node_bindings" (
        "id_scada_node_binding" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "id_scada_node" UUID NOT NULL REFERENCES "scada_nodes"("id_scada_node") ON DELETE CASCADE,
        "binding_key" VARCHAR(100) NOT NULL,
        "id_sensor_channel" UUID NOT NULL REFERENCES "sensor_channels"("id_sensor_channel") ON DELETE RESTRICT,
        "display_label" VARCHAR(255),
        "unit_override" VARCHAR(50),
        "transform_json" JSONB,
        "priority_order" INTEGER NOT NULL DEFAULT 0,
        "is_primary" BOOLEAN NOT NULL DEFAULT false,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_bindings_node"
      ON "scada_node_bindings" ("id_scada_node")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_scada_bindings_sensor_channel"
      ON "scada_node_bindings" ("id_sensor_channel")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_scada_bindings_node_key_channel"
      ON "scada_node_bindings" ("id_scada_node", "binding_key", "id_sensor_channel")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scada_node_bindings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scada_edges" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scada_nodes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scada_diagrams" CASCADE`);
  }
}
