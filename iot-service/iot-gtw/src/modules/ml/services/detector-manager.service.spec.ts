import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DetectorManagerService } from './detector-manager.service';

describe('DetectorManagerService', () => {
  let service: DetectorManagerService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'opensearch.url': 'https://localhost:9200',
        'opensearch.username': 'admin',
        'opensearch.password': 'test123',
        'opensearch.sslVerify': false,
        'opensearch.indexPrefix': 'sensor-telemetry-10min-',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DetectorManagerService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DetectorManagerService>(DetectorManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableDetectorTypes', () => {
    it('should return predefined detector types', () => {
      const types = service.getAvailableDetectorTypes();
      
      expect(types).toContain('pressure');
      expect(types).toContain('flow');
      expect(types).toContain('level');
      expect(types).toContain('debit');
      expect(types.length).toBe(4);
    });
  });

  describe('getDetectorConfig', () => {
    it('should return config for pressure detector', () => {
      const config = service.getDetectorConfig('pressure');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('pdam-pressure-detector');
      expect(config?.timeField).toBe('time_bucket');
      expect(config?.shingleSize).toBe(8);
    });

    it('should return config for flow detector', () => {
      const config = service.getDetectorConfig('flow');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('pdam-flow-detector');
    });

    it('should return config for level detector', () => {
      const config = service.getDetectorConfig('level');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('pdam-level-detector');
    });

    it('should return config for debit detector', () => {
      const config = service.getDetectorConfig('debit');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('pdam-debit-detector');
    });

    it('should return undefined for unknown metric', () => {
      const config = service.getDetectorConfig('unknown');
      
      expect(config).toBeUndefined();
    });
  });

  describe('Detector Config Properties', () => {
    it('should have correct detection interval for all detectors', () => {
      const types = service.getAvailableDetectorTypes();
      
      types.forEach((type) => {
        const config = service.getDetectorConfig(type);
        expect(config?.detectionInterval.interval).toBe(10);
        expect(config?.detectionInterval.unit).toBe('MINUTES');
      });
    });

    it('should have correct window delay for all detectors', () => {
      const types = service.getAvailableDetectorTypes();
      
      types.forEach((type) => {
        const config = service.getDetectorConfig(type);
        expect(config?.windowDelay.interval).toBe(2);
        expect(config?.windowDelay.unit).toBe('MINUTES');
      });
    });

    it('should have category field set to channel_id', () => {
      const types = service.getAvailableDetectorTypes();
      
      types.forEach((type) => {
        const config = service.getDetectorConfig(type);
        expect(config?.categoryField).toContain('channel_id');
      });
    });

    it('should have feature attributes defined', () => {
      const types = service.getAvailableDetectorTypes();
      
      types.forEach((type) => {
        const config = service.getDetectorConfig(type);
        expect(config?.featureAttributes.length).toBeGreaterThan(0);
        expect(config?.featureAttributes[0].featureEnabled).toBe(true);
      });
    });
  });
});

describe('DetectorManagerService - API Operations', () => {
  let service: DetectorManagerService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DetectorManagerService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DetectorManagerService>(DetectorManagerService);
  });

  describe('createDetector', () => {
    it('should throw error for unknown metric code', async () => {
      await expect(service.createDetector('unknown')).rejects.toThrow(
        'No detector configuration found for metric: unknown',
      );
    });

    it('should throw error when client not initialized', async () => {
      await expect(service.createDetector('pressure')).rejects.toThrow(
        'OpenSearch client not initialized',
      );
    });
  });

  describe('listDetectors', () => {
    it('should throw error when client not initialized', async () => {
      await expect(service.listDetectors()).rejects.toThrow(
        'OpenSearch client not initialized',
      );
    });
  });

  describe('startDetector', () => {
    it('should throw error when client not initialized', async () => {
      await expect(service.startDetector('test-id')).rejects.toThrow(
        'OpenSearch client not initialized',
      );
    });
  });

  describe('stopDetector', () => {
    it('should throw error when client not initialized', async () => {
      await expect(service.stopDetector('test-id')).rejects.toThrow(
        'OpenSearch client not initialized',
      );
    });
  });
});
