import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUnpairedDevicesPayloadToArray1734242400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert existing last_payload to array format with timestamp
    await queryRunner.query(`
      UPDATE node_unpaired_devices 
      SET last_payload = jsonb_build_array(
        jsonb_build_object(
          'payload', last_payload,
          'timestamp', last_seen_at
        )
      )
      WHERE last_payload IS NOT NULL 
        AND jsonb_typeof(last_payload) = 'object';
    `);

    // Add comment to reflect new structure
    await queryRunner.query(`
      COMMENT ON COLUMN node_unpaired_devices.last_payload IS 
      'Array of last 10 payloads with timestamps: [{payload: {}, timestamp: "2025-01-01T00:00:00Z"}]';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to single payload (take the first/latest one)
    await queryRunner.query(`
      UPDATE node_unpaired_devices 
      SET last_payload = (last_payload->0->>'payload')::jsonb
      WHERE last_payload IS NOT NULL 
        AND jsonb_typeof(last_payload) = 'array'
        AND jsonb_array_length(last_payload) > 0;
    `);

    // Restore old comment
    await queryRunner.query(`
      COMMENT ON COLUMN node_unpaired_devices.last_payload IS 
      'Last received raw payload from device';
    `);
  }
}
