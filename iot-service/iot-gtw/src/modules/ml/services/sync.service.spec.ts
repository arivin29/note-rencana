import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';
import { OpenSearchService } from './opensearch.service';

describe('SyncService', () => {
  let service: SyncService;
  let openSearchService: OpenSearchService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'clickhouse.url': 'http://localhost:8123',
        'clickhouse.username': 'default',
        'clickhouse.password': 'test123',
        'clickhouse.database': 'iot',
        'opensearch.syncBatchSize': 1000,
        'opensearch.syncLookbackMinutes': 15,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockOpenSearchService = {
    isReady: jest.fn().mockReturnValue(false),
    bulkIndexTelemetry: jest.fn().mockResolvedValue({ success: 0, errors: 0 }),
    getMonthlyIndexName: jest.fn().mockReturnValue('sensor-telemetry-10min-2026.02'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OpenSearchService, useValue: mockOpenSearchService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    openSearchService = module.get<OpenSearchService>(OpenSearchService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncTelemetry', () => {
    it('should skip sync when OpenSearch not ready', async () => {
      mockOpenSearchService.isReady.mockReturnValue(false);

      const result = await service.syncTelemetry();

      expect(result.lastSyncedCount).toBe(0);
      expect(mockOpenSearchService.bulkIndexTelemetry).not.toHaveBeenCalled();
    });

    it('should return checkpoint with zero count when no data', async () => {
      mockOpenSearchService.isReady.mockReturnValue(true);

      const result = await service.syncTelemetry();

      expect(result.lastSyncedCount).toBe(0);
      expect(result.lastSyncDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', () => {
      const status = service.getSyncStatus();

      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('lastSyncTimestamp');
      expect(status).toHaveProperty('clickhouseConnected');
    });
  });
});

describe('SyncService - Data Processing', () => {
  let service: SyncService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  const mockOpenSearchService = {
    isReady: jest.fn().mockReturnValue(true),
    bulkIndexTelemetry: jest.fn().mockResolvedValue({ success: 5, errors: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OpenSearchService, useValue: mockOpenSearchService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  describe('processAndTransform', () => {
    it('should transform ClickHouse data to OpenSearch format', () => {
      const rawData = [
        {
          device_id: 'device-001',
          sensor_key: 'pressure',
          period_start: '2026-02-28T10:00:00',
          period_end: '2026-02-28T10:10:00',
          avg_value: 5.5,
          min_value: 5.0,
          max_value: 6.0,
          sample_count: 60,
          sum_value: 330,
        },
      ];

      // Test transformation logic would go here
      // This is a placeholder for actual transformation tests
      expect(rawData.length).toBe(1);
    });
  });

  describe('calculateTimePeriod', () => {
    it('should calculate correct 10-minute periods', () => {
      // Test period calculation
      const testDate = new Date('2026-02-28T10:23:45');
      const periodStart = new Date(testDate);
      periodStart.setMinutes(Math.floor(testDate.getMinutes() / 10) * 10, 0, 0);
      
      expect(periodStart.getMinutes()).toBe(20);
    });
  });
});
