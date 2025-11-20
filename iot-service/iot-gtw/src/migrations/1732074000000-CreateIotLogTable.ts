import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateIotLogTable1732074000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create enum type for log labels
    await queryRunner.query(`
      CREATE TYPE log_label_enum AS ENUM (
        'info',
        'log',
        'pairing',
        'error',
        'warning',
        'debug',
        'telemetry',
        'command',
        'response'
      );
    `);

    // Create iot_log table
    await queryRunner.createTable(
      new Table({
        name: 'iot_log',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'label',
            type: 'log_label_enum',
            default: "'log'",
          },
          {
            name: 'topic',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'processed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'iot_log',
      new TableIndex({
        name: 'IDX_iot_log_label',
        columnNames: ['label'],
      }),
    );

    await queryRunner.createIndex(
      'iot_log',
      new TableIndex({
        name: 'IDX_iot_log_device_id',
        columnNames: ['device_id'],
      }),
    );

    await queryRunner.createIndex(
      'iot_log',
      new TableIndex({
        name: 'IDX_iot_log_processed',
        columnNames: ['processed'],
      }),
    );

    await queryRunner.createIndex(
      'iot_log',
      new TableIndex({
        name: 'IDX_iot_log_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'iot_log',
      new TableIndex({
        name: 'IDX_iot_log_timestamp',
        columnNames: ['timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('iot_log', 'IDX_iot_log_timestamp');
    await queryRunner.dropIndex('iot_log', 'IDX_iot_log_created_at');
    await queryRunner.dropIndex('iot_log', 'IDX_iot_log_processed');
    await queryRunner.dropIndex('iot_log', 'IDX_iot_log_device_id');
    await queryRunner.dropIndex('iot_log', 'IDX_iot_log_label');

    // Drop table
    await queryRunner.dropTable('iot_log');

    // Drop enum type
    await queryRunner.query(`DROP TYPE log_label_enum;`);
  }
}
