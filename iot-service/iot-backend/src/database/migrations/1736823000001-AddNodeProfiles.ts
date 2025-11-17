import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNodeProfiles1736823000001 implements MigrationInterface {
  name = 'AddNodeProfiles1736823000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create node_profiles table
    await queryRunner.query(`
      CREATE TABLE node_profiles (
        id_node_profile UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_node_model UUID NOT NULL REFERENCES node_models(id_node_model) ON DELETE CASCADE,
        id_project UUID REFERENCES projects(id_project) ON DELETE SET NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parser_type TEXT NOT NULL,
        mapping_json JSONB NOT NULL,
        transform_script TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (id_node_model, code)
      );
    `);

    await queryRunner.query(`
      COMMENT ON TABLE node_profiles IS 'Payload parsing profiles for different node models';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN node_profiles.parser_type IS 'Parser type: json_path, lorawan, modbus, etc.';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN node_profiles.mapping_json IS 'JSON mapping configuration for parsing payloads to sensor channels';
    `);

    // Add id_node_profile column to nodes table
    await queryRunner.query(`
      ALTER TABLE nodes
      ADD COLUMN id_node_profile UUID REFERENCES node_profiles(id_node_profile) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN nodes.id_node_profile IS 'Assigned parsing profile for this node';
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_node_profiles_node_model ON node_profiles(id_node_model);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_node_profiles_project ON node_profiles(id_project);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_nodes_node_profile ON nodes(id_node_profile);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nodes_node_profile;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_node_profiles_project;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_node_profiles_node_model;`);

    // Remove column from nodes table
    await queryRunner.query(`ALTER TABLE nodes DROP COLUMN IF EXISTS id_node_profile;`);

    // Drop node_profiles table
    await queryRunner.query(`DROP TABLE IF EXISTS node_profiles;`);
  }
}
