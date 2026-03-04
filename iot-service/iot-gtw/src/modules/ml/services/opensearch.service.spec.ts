import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from './opensearch.service';

describe('OpenSearchService', () => {
  let service: OpenSearchService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'opensearch.url': 'https://localhost:9200',
        'opensearch.username': 'admin',
        'opensearch.password': 'test123',
        'opensearch.sslVerify': false,
        'opensearch.indexPrefix': 'sensor-telemetry-10min-',
        'opensearch.anomalyIndexPrefix': 'anomaly-results-',
        'opensearch.retryMaxAttempts': 3,
        'opensearch.retryInitialDelayMs': 2000,
        'opensearch.retryMaxDelayMs': 30000,
        'opensearch.circuitBreakerFailureThreshold': 5,
        'opensearch.circuitBreakerResetTimeoutMs': 60000,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenSearchService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OpenSearchService>(OpenSearchService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    // Cleanup
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlyIndexName', () => {
    it('should generate correct monthly index name', () => {
      const date = new Date('2026-02-15');
      const indexName = service.getMonthlyIndexName('sensor-telemetry-10min-', date);
      expect(indexName).toBe('sensor-telemetry-10min-2026.02');
    });

    it('should pad month with zero', () => {
      const date = new Date('2026-01-05');
      const indexName = service.getMonthlyIndexName('test-', date);
      expect(indexName).toBe('test-2026.01');
    });
  });

  describe('Circuit Breaker', () => {
    it('should start with closed circuit breaker', () => {
      const status = service.getCircuitBreakerStatus();
      expect(status.isOpen).toBe(false);
      expect(status.failures).toBe(0);
    });
  });

  describe('isReady', () => {
    it('should return false when not connected', () => {
      // Service starts disconnected in test (no real OpenSearch)
      expect(service.isReady()).toBe(false);
    });
  });
});

describe('OpenSearchService - Index Operations', () => {
  let service: OpenSearchService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'opensearch.url': 'https://localhost:9200',
        'opensearch.username': 'admin',
        'opensearch.password': 'test123',
        'opensearch.sslVerify': false,
        'opensearch.indexPrefix': 'sensor-telemetry-10min-',
        'opensearch.anomalyIndexPrefix': 'anomaly-results-',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenSearchService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OpenSearchService>(OpenSearchService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('bulkIndexTelemetry', () => {
    it('should throw error when service not ready', async () => {
      await expect(service.bulkIndexTelemetry([])).rejects.toThrow('OpenSearch service not ready');
    });

    it('should return zero counts for empty data', async () => {
      // Mock the service as ready
      jest.spyOn(service, 'isReady').mockReturnValue(true);
      
      const result = await service.bulkIndexTelemetry([]);
      expect(result).toEqual({ success: 0, errors: 0 });
    });
  });

  describe('bulkIndexAnomalies', () => {
    it('should throw error when service not ready', async () => {
      await expect(service.bulkIndexAnomalies([])).rejects.toThrow('OpenSearch service not ready');
    });
  });
});
