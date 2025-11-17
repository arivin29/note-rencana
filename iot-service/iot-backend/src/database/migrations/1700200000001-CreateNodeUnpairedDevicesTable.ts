import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateNodeUnpairedDevicesTable1700200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create node_unpaired_devices table
    await queryRunner.createTable(
      new Table({
        name: 'node_unpaired_devices',
        columns: [
          {
            name: 'id_node_unpaired_device',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'hardware_id',
            type: 'text',
            isNullable: false,
            comment: 'Unique hardware identifier: IMEI, dev_eui, MAC address, serial number',
          },
          {
            name: 'id_node_model',
            type: 'uuid',
            isNullable: true,
            comment: 'Auto-detected or manually assigned node model',
          },
          {
            name: 'first_seen_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'last_seen_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'last_payload',
            type: 'jsonb',
            isNullable: true,
            comment: 'Last received raw payload from device',
          },
          {
            name: 'last_topic',
            type: 'text',
            isNullable: true,
            comment: 'Last MQTT topic where data was received',
          },
          {
            name: 'seen_count',
            type: 'integer',
            default: 1,
            comment: 'Number of times this device has sent data',
          },
          {
            name: 'suggested_project',
            type: 'uuid',
            isNullable: true,
            comment: 'Suggested project for pairing (based on topic/rules)',
          },
          {
            name: 'suggested_owner',
            type: 'uuid',
            isNullable: true,
            comment: 'Suggested owner for pairing',
          },
          {
            name: 'paired_node_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Reference to nodes table after pairing (optional tracking)',
          },
          {
            name: 'status',
            type: 'text',
            default: "'pending'",
            comment: 'Status: pending, paired, ignored',
          },
        ],
      }),
      true,
    );

    // Create unique index on hardware_id
    await queryRunner.createIndex(
      'node_unpaired_devices',
      new TableIndex({
        name: 'idx_node_unpaired_hardware',
        columnNames: ['hardware_id'],
        isUnique: true,
      }),
    );

    // Create index on status for filtering
    await queryRunner.createIndex(
      'node_unpaired_devices',
      new TableIndex({
        name: 'idx_node_unpaired_status',
        columnNames: ['status'],
      }),
    );

    // Create index on last_seen_at for sorting
    await queryRunner.createIndex(
      'node_unpaired_devices',
      new TableIndex({
        name: 'idx_node_unpaired_last_seen',
        columnNames: ['last_seen_at'],
      }),
    );

    // Create foreign key to node_models
    await queryRunner.createForeignKey(
      'node_unpaired_devices',
      new TableForeignKey({
        name: 'fk_node_unpaired_node_model',
        columnNames: ['id_node_model'],
        referencedTableName: 'node_models',
        referencedColumnNames: ['id_node_model'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key to projects (suggested)
    await queryRunner.createForeignKey(
      'node_unpaired_devices',
      new TableForeignKey({
        name: 'fk_node_unpaired_suggested_project',
        columnNames: ['suggested_project'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id_project'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key to owners (suggested)
    await queryRunner.createForeignKey(
      'node_unpaired_devices',
      new TableForeignKey({
        name: 'fk_node_unpaired_suggested_owner',
        columnNames: ['suggested_owner'],
        referencedTableName: 'owners',
        referencedColumnNames: ['id_owner'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key to nodes (after pairing)
    await queryRunner.createForeignKey(
      'node_unpaired_devices',
      new TableForeignKey({
        name: 'fk_node_unpaired_paired_node',
        columnNames: ['paired_node_id'],
        referencedTableName: 'nodes',
        referencedColumnNames: ['id_node'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('node_unpaired_devices', 'fk_node_unpaired_paired_node');
    await queryRunner.dropForeignKey('node_unpaired_devices', 'fk_node_unpaired_suggested_owner');
    await queryRunner.dropForeignKey('node_unpaired_devices', 'fk_node_unpaired_suggested_project');
    await queryRunner.dropForeignKey('node_unpaired_devices', 'fk_node_unpaired_node_model');

    // Drop indexes
    await queryRunner.dropIndex('node_unpaired_devices', 'idx_node_unpaired_last_seen');
    await queryRunner.dropIndex('node_unpaired_devices', 'idx_node_unpaired_status');
    await queryRunner.dropIndex('node_unpaired_devices', 'idx_node_unpaired_hardware');

    // Drop table
    await queryRunner.dropTable('node_unpaired_devices');
  }
}
