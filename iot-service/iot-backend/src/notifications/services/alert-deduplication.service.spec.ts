import { Test, TestingModule } from '@nestjs/testing';
import { AlertDeduplicationService } from './alert-deduplication.service';

describe('AlertDeduplicationService', () => {
  let service: AlertDeduplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertDeduplicationService],
    }).compile();

    service = module.get<AlertDeduplicationService>(AlertDeduplicationService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldSendAlert', () => {
    it('should allow first alert for new key', () => {
      const alert = {
        deviceId: 'device-001',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      const result = service.shouldSendAlert(alert);
      expect(result).toBe(true);
    });

    it('should suppress duplicate alert within window', () => {
      const alert = {
        deviceId: 'device-001',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      // First alert should pass
      expect(service.shouldSendAlert(alert)).toBe(true);
      
      // Second alert should be suppressed
      expect(service.shouldSendAlert(alert)).toBe(false);
    });

    it('should allow alerts with different device IDs', () => {
      const alert1 = {
        deviceId: 'device-001',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      const alert2 = {
        deviceId: 'device-002',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      expect(service.shouldSendAlert(alert1)).toBe(true);
      expect(service.shouldSendAlert(alert2)).toBe(true);
    });

    it('should allow alerts with different severity levels', () => {
      const alertCritical = {
        deviceId: 'device-001',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      const alertSevere = {
        deviceId: 'device-001',
        sensorKey: 'pressure',
        severity: 'severe',
      };

      expect(service.shouldSendAlert(alertCritical)).toBe(true);
      expect(service.shouldSendAlert(alertSevere)).toBe(true);
    });

    it('should allow alerts with different sensor keys', () => {
      const alertPressure = {
        deviceId: 'device-001',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      const alertFlow = {
        deviceId: 'device-001',
        sensorKey: 'flow',
        severity: 'critical',
      };

      expect(service.shouldSendAlert(alertPressure)).toBe(true);
      expect(service.shouldSendAlert(alertFlow)).toBe(true);
    });
  });

  describe('resetSuppression', () => {
    it('should reset suppression for specific alert', () => {
      const alert = {
        deviceId: 'device-001',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      // First alert
      expect(service.shouldSendAlert(alert)).toBe(true);
      // Second alert suppressed
      expect(service.shouldSendAlert(alert)).toBe(false);
      
      // Reset suppression
      service.resetSuppression(alert);
      
      // Should allow again
      expect(service.shouldSendAlert(alert)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return dedup statistics', () => {
      const alert1 = { deviceId: 'device-001', sensorKey: 'pressure', severity: 'critical' };
      const alert2 = { deviceId: 'device-002', sensorKey: 'flow', severity: 'severe' };

      service.shouldSendAlert(alert1);
      service.shouldSendAlert(alert2);

      const stats = service.getStats();
      
      expect(stats.activeKeys).toBe(2);
      expect(stats.totalAlertsSent).toBe(2);
    });

    it('should return empty stats when no alerts', () => {
      const stats = service.getStats();
      
      expect(stats.activeKeys).toBe(0);
      expect(stats.totalAlertsSent).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all suppression entries', () => {
      const alert = { deviceId: 'device-001', sensorKey: 'pressure', severity: 'critical' };

      service.shouldSendAlert(alert);
      expect(service.getStats().activeKeys).toBe(1);

      service.clearAll();
      expect(service.getStats().activeKeys).toBe(0);
    });
  });
});

describe('AlertDeduplicationService - Edge Cases', () => {
  let service: AlertDeduplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertDeduplicationService],
    }).compile();

    service = module.get<AlertDeduplicationService>(AlertDeduplicationService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('Multiple suppressed alerts', () => {
    it('should suppress multiple duplicate alerts', () => {
      const alert = { deviceId: 'device-001', sensorKey: 'pressure', severity: 'critical' };

      expect(service.shouldSendAlert(alert)).toBe(true);  // First: allowed
      expect(service.shouldSendAlert(alert)).toBe(false); // Suppressed
      expect(service.shouldSendAlert(alert)).toBe(false); // Suppressed
      expect(service.shouldSendAlert(alert)).toBe(false); // Suppressed
    });
  });

  describe('Special characters in keys', () => {
    it('should handle special characters in device ID', () => {
      const alert = {
        deviceId: 'device:with:colons',
        sensorKey: 'pressure',
        severity: 'critical',
      };

      expect(service.shouldSendAlert(alert)).toBe(true);
      expect(service.shouldSendAlert(alert)).toBe(false);
    });
  });
});
