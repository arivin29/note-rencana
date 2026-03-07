import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIdToCustomDashboards1741304400000 implements MigrationInterface {
  name = 'AddProjectIdToCustomDashboards1741304400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add id_project column to custom_dashboards table (nullable - dashboards can be global)
    await queryRunner.query(`
      ALTER TABLE custom_dashboards 
      ADD COLUMN IF NOT EXISTS id_project UUID NULL
    `);

    // Add foreign key constraint to projects table
    await queryRunner.query(`
      ALTER TABLE custom_dashboards 
      ADD CONSTRAINT fk_custom_dashboards_project 
      FOREIGN KEY (id_project) REFERENCES projects(id_project) 
      ON DELETE SET NULL
    `);

    // Add index for filtering dashboards by project
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_dashboards_project 
      ON custom_dashboards(id_project)
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON COLUMN custom_dashboards.id_project IS 'Optional project association for project-specific dashboards'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_custom_dashboards_project
    `);

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE custom_dashboards 
      DROP CONSTRAINT IF EXISTS fk_custom_dashboards_project
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE custom_dashboards 
      DROP COLUMN IF EXISTS id_project
    `);
  }
}
