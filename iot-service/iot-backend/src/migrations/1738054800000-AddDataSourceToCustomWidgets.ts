import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataSourceToCustomWidgets1738054800000 implements MigrationInterface {
  name = 'AddDataSourceToCustomWidgets1738054800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add data_source column to custom_widgets table
    await queryRunner.query(`
      ALTER TABLE custom_widgets 
      ADD COLUMN IF NOT EXISTS data_source VARCHAR(20) DEFAULT 'postgresql'
    `);

    // Add check constraint for valid values
    await queryRunner.query(`
      ALTER TABLE custom_widgets 
      ADD CONSTRAINT chk_data_source 
      CHECK (data_source IN ('postgresql', 'clickhouse'))
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON COLUMN custom_widgets.data_source IS 'Data source for query execution: postgresql or clickhouse'
    `);

    // Create index for filtering by data source
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_widgets_data_source 
      ON custom_widgets(data_source)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_custom_widgets_data_source
    `);

    // Drop constraint
    await queryRunner.query(`
      ALTER TABLE custom_widgets 
      DROP CONSTRAINT IF EXISTS chk_data_source
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE custom_widgets 
      DROP COLUMN IF EXISTS data_source
    `);
  }
}
