export class ProcessTelemetryResultDto {
  success: boolean;
  iotLogId: string;
  nodeCode?: string;
  profileCode?: string;
  sensorsProcessed: number;
  channelsProcessed: number;
  sensorLogsCreated: number;
  errors: string[];
  processingTimeMs: number;
}

export class BulkProcessResultDto {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: ProcessTelemetryResultDto[];
  totalProcessingTimeMs: number;
}
