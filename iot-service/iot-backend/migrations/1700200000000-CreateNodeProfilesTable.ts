import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateNodeProfilesTable1700200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create node_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'node_profiles',
        columns: [
          {
            name: 'id_node_profile',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'id_node_model',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'id_project',
            type: 'uuid',
            isNullable: true,
            comment: 'NULL = global profile, dapat digunakan oleh semua project',
          },
          {
            name: 'code',
            type: 'text',
            isNullable: false,
            comment: 'Unique code per node model, e.g. fmb130-default, esp32-water-v1',
          },
          {
            name: 'name',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parser_type',
            type: 'text',
            isNullable: false,
            comment: 'Parser type: json_path, teltonika_codec_8, custom_script, etc.',
          },
          {
            name: 'mapping_json',
            type: 'jsonb',
            isNullable: false,
            comment: 'Mapping definition: payload structure -> sensor channels',
          },
          {
            name: 'transform_script',
            type: 'text',
            isNullable: true,
            comment: 'Optional custom transformation script',
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create unique constraint for node_model + code
    await queryRunner.createIndex(
      'node_profiles',
      new TableIndex({
        name: 'unique_node_profile_per_model_code',
        columnNames: ['id_node_model', 'code'],
        isUnique: true,
      }),
    );

    // Create foreign key to node_models
    await queryRunner.createForeignKey(
      'node_profiles',
      new TableForeignKey({
        name: 'fk_node_profiles_node_model',
        columnNames: ['id_node_model'],
        referencedTableName: 'node_models',
        referencedColumnNames: ['id_node_model'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key to projects (optional)
    await queryRunner.createForeignKey(
      'node_profiles',
      new TableForeignKey({
        name: 'fk_node_profiles_project',
        columnNames: ['id_project'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id_project'],
        onDelete: 'SET NULL',
      }),
    );

    // Add id_node_profile column to nodes table
    await queryRunner.query(`
      ALTER TABLE nodes
        ADD COLUMN id_node_profile UUID REFERENCES node_profiles(id_node_profile) ON DELETE SET NULL;
    `);

    // Create index on nodes.id_node_profile
    await queryRunner.createIndex(
      'nodes',
      new TableIndex({
        name: 'idx_nodes_node_profile',
        columnNames: ['id_node_profile'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index on nodes
    await queryRunner.dropIndex('nodes', 'idx_nodes_node_profile');

    // Remove column from nodes
    await queryRunner.query(`ALTER TABLE nodes DROP COLUMN id_node_profile;`);

    // Drop foreign keys
    await queryRunner.dropForeignKey('node_profiles', 'fk_node_profiles_project');
    await queryRunner.dropForeignKey('node_profiles', 'fk_node_profiles_node_model');

    // Drop unique index
    await queryRunner.dropIndex('node_profiles', 'unique_node_profile_per_model_code');

    // Drop table
    await queryRunner.dropTable('node_profiles');
  }
}
