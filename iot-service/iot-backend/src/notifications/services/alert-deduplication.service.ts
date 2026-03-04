import { Injectable, Logger } from '@nestjs/common';

export interface AlertKey {
  deviceId: string;
  sensorKey: string;
  severity: string;
}

interface DedupEntry {
  timestamp: number;
  count: number;
}

@Injectable()
export class AlertDeduplicationService {
  private readonly logger = new Logger(AlertDeduplicationService.name);
  
  // Map of alert key -> last alert timestamp
  private dedupMap: Map<string, DedupEntry> = new Map();
  
  // Suppression window in milliseconds (30 minutes)
  private readonly suppressionWindowMs: number;
  
  // Cleanup interval handle
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.suppressionWindowMs = parseInt(process.env.ALERT_SUPPRESSION_WINDOW_MS || '1800000', 10); // 30 min default
    
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Build a unique key for deduplication
   */
  private buildKey(alert: AlertKey): string {
    return `${alert.deviceId}:${alert.sensorKey}:${alert.severity}`;
  }

  /**
   * Check if alert should be suppressed
   * Returns true if alert should be sent, false if suppressed
   */
  shouldSendAlert(alert: AlertKey): boolean {
    const key = this.buildKey(alert);
    const now = Date.now();
    const entry = this.dedupMap.get(key);

    if (!entry) {
      // First time seeing this alert
      this.dedupMap.set(key, { timestamp: now, count: 1 });
      this.logger.debug(`New alert key: ${key}`);
      return true;
    }

    const elapsed = now - entry.timestamp;
    if (elapsed >= this.suppressionWindowMs) {
      // Suppression window expired, allow new alert
      this.dedupMap.set(key, { timestamp: now, count: entry.count + 1 });
      this.logger.debug(`Alert key ${key} suppression expired after ${elapsed}ms, allowing (total: ${entry.count + 1})`);
      return true;
    }

    // Still within suppression window
    this.logger.debug(`Alert key ${key} suppressed, ${this.suppressionWindowMs - elapsed}ms remaining`);
    return false;
  }

  /**
   * Force reset suppression for a specific alert
   * Useful when severity escalates
   */
  resetSuppression(alert: AlertKey): void {
    const key = this.buildKey(alert);
    this.dedupMap.delete(key);
    this.logger.debug(`Reset suppression for key: ${key}`);
  }

  /**
   * Check if severity escalated (requires immediate alert)
   */
  shouldEscalate(
    alert: AlertKey,
    previousSeverity: 'mild' | 'moderate' | 'severe' | 'critical'
  ): boolean {
    const severityOrder = { mild: 1, moderate: 2, severe: 3, critical: 4 };
    const currentLevel = severityOrder[alert.severity as keyof typeof severityOrder] || 0;
    const previousLevel = severityOrder[previousSeverity] || 0;
    
    if (currentLevel > previousLevel) {
      this.logger.log(`Severity escalated from ${previousSeverity} to ${alert.severity}`);
      return true;
    }
    return false;
  }

  /**
   * Get suppression statistics
   */
  getStats(): { activeKeys: number; totalAlertsSent: number } {
    let totalAlertsSent = 0;
    for (const entry of this.dedupMap.values()) {
      totalAlertsSent += entry.count;
    }
    return {
      activeKeys: this.dedupMap.size,
      totalAlertsSent,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.dedupMap.entries()) {
      const elapsed = now - entry.timestamp;
      // Remove entries older than 2x suppression window
      if (elapsed >= this.suppressionWindowMs * 2) {
        this.dedupMap.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired dedup entries`);
    }
  }

  /**
   * Clear all suppression data (for testing)
   */
  clearAll(): void {
    this.dedupMap.clear();
    this.logger.log('Cleared all dedup entries');
  }
}
