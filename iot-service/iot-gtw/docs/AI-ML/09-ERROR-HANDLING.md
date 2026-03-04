# Error Handling Strategy

**Date:** 2026-02-27  
**Status:** 📋 Design Phase  
**Version:** 1.0

---

## 1. Overview

### 1.1 Error Categories

| Category | Source | Impact | Strategy |
|----------|--------|--------|----------|
| **External Service** | OpenSearch, SMTP | Medium-High | Retry + Circuit Breaker |
| **Database** | PostgreSQL, ClickHouse | High | Retry + Graceful Degradation |
| **Business Logic** | Validation, ML | Low-Medium | Return error response |
| **Infrastructure** | Network, Timeout | High | Retry + Fallback |

### 1.2 Goals

1. **Resilience:** System continues operating despite partial failures
2. **Visibility:** All errors are logged and traceable
3. **Recovery:** Automatic recovery when possible
4. **Graceful Degradation:** Fallback to less accurate but available methods

---

## 2. Retry Strategy

### 2.1 Exponential Backoff

```typescript
// src/common/utils/retry.util.ts

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: Error;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (opts.retryableErrors && !isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      // Last attempt - throw
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // Log retry
      console.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed: ${error.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // Wait before retry
      await sleep(delay);

      // Calculate next delay with jitter
      delay = Math.min(
        delay * opts.backoffMultiplier * (0.5 + Math.random()),
        opts.maxDelayMs
      );
    }
  }

  throw lastError!;
}

function isRetryable(error: Error, retryableErrors: string[]): boolean {
  const message = error.message.toLowerCase();
  return retryableErrors.some(e => 
    message.includes(e.toLowerCase()) ||
    error.constructor.name.includes(e)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 2.2 Retry Configuration Per Service

```typescript
// src/config/retry.config.ts

export const retryConfig = {
  opensearch: {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ConnectionError',
      'timeout',
      '503',
      '429', // Too many requests
    ],
  },

  clickhouse: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Code: 159', // Timeout
      'Code: 202', // Too many parts
    ],
  },

  smtp: {
    maxAttempts: 3,
    initialDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNREFUSED',
      'ETIMEDOUT',
      '421', // Service not available
      '452', // Insufficient storage
    ],
  },

  postgres: {
    maxAttempts: 2,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNREFUSED',
      '53300', // Too many connections
      '40001', // Serialization failure
    ],
  },
};
```

---

## 3. Circuit Breaker Pattern

### 3.1 Implementation

```typescript
// src/common/circuit-breaker/circuit-breaker.ts

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject calls
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Failures to open circuit
  successThreshold: number;    // Successes to close circuit
  timeout: number;             // Time in OPEN state before HALF_OPEN (ms)
  monitorInterval: number;     // Time window for counting failures (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      monitorInterval: 30000,
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitOpenError(
          `Circuit ${this.name} is OPEN. Try again later.`
        );
      }
      // Try to recover
      this.state = CircuitState.HALF_OPEN;
      this.log('State: HALF_OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.log('State: CLOSED (recovered)');
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Failed recovery attempt
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      this.successes = 0;
      this.log('State: OPEN (recovery failed)');
    } else {
      this.failures++;
      if (this.failures >= this.options.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttempt = Date.now() + this.options.timeout;
        this.log(`State: OPEN (threshold reached: ${this.failures})`);
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): object {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt > Date.now() 
        ? new Date(this.nextAttempt).toISOString()
        : null,
    };
  }

  private log(msg: string): void {
    console.log(`[CircuitBreaker:${this.name}] ${msg}`);
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
```

### 3.2 Circuit Breakers Per Service

```typescript
// src/modules/ml/circuit-breakers.ts

import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from '../../common/circuit-breaker/circuit-breaker';

@Injectable()
export class CircuitBreakers {
  readonly opensearch = new CircuitBreaker('opensearch', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,      // 1 minute
    monitorInterval: 30000,
  });

  readonly clickhouse = new CircuitBreaker('clickhouse', {
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 30000,      // 30 seconds
    monitorInterval: 15000,
  });

  readonly smtp = new CircuitBreaker('smtp', {
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 120000,     // 2 minutes (SMTP can be slow)
    monitorInterval: 60000,
  });

  getAllStats(): object {
    return {
      opensearch: this.opensearch.getStats(),
      clickhouse: this.clickhouse.getStats(),
      smtp: this.smtp.getStats(),
    };
  }
}
```

### 3.3 Usage in Services

```typescript
// Example: OpenSearch service with circuit breaker

@Injectable()
export class OpenSearchService {
  constructor(
    private circuitBreakers: CircuitBreakers,
    private httpService: HttpService,
  ) {}

  async getAnomalyResults(detectorId: string): Promise<any[]> {
    return this.circuitBreakers.opensearch.execute(async () => {
      return withRetry(
        () => this.fetchFromOpenSearch(detectorId),
        retryConfig.opensearch
      );
    });
  }
}
```

---

## 4. Graceful Degradation

### 4.1 Fallback Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ANOMALY DETECTION FALLBACK                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Level 1: OpenSearch ML (Recommended)                                   │
│     │                                                                   │
│     │ If OpenSearch fails...                                           │
│     ▼                                                                   │
│  Level 2: Forecast-Based Detection                                      │
│     │     Compare actual vs predicted from forecast_results             │
│     │                                                                   │
│     │ If no forecast available...                                      │
│     ▼                                                                   │
│  Level 3: Static Threshold Detection                                    │
│           Use min_threshold/max_threshold from sensor_channels          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation

```typescript
// src/modules/ml/services/anomaly-detection.service.ts

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(
    private opensearchService: OpenSearchService,
    private forecastService: ForecastService,
    private staticThresholdService: StaticThresholdService,
    private circuitBreakers: CircuitBreakers,
    private metricsService: MetricsService,
  ) {}

  async detectAnomalies(data: TelemetryData[]): Promise<AnomalyResult[]> {
    // Try OpenSearch ML first
    if (this.circuitBreakers.opensearch.getState() !== 'OPEN') {
      try {
        const results = await this.opensearchService.detectAnomalies(data);
        this.metricsService.recordDetectionMethod('opensearch');
        return results;
      } catch (error) {
        this.logger.warn(`OpenSearch detection failed: ${error.message}`);
      }
    }

    // Fallback to forecast-based detection
    try {
      const forecasts = await this.forecastService.getCurrentForecasts(
        data.map(d => d.channelId)
      );
      
      if (forecasts.length > 0) {
        const results = await this.detectWithForecast(data, forecasts);
        this.metricsService.recordDetectionMethod('forecast');
        this.logger.log('Using forecast-based detection fallback');
        return results;
      }
    } catch (error) {
      this.logger.warn(`Forecast detection failed: ${error.message}`);
    }

    // Final fallback: static thresholds
    this.logger.warn('Using static threshold detection (last resort)');
    this.metricsService.recordDetectionMethod('static');
    return this.staticThresholdService.detectAnomalies(data);
  }

  private async detectWithForecast(
    data: TelemetryData[],
    forecasts: ForecastResult[]
  ): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];
    
    for (const telemetry of data) {
      const forecast = forecasts.find(
        f => f.idSensorChannel === telemetry.channelId &&
             Math.abs(f.forecastTime.getTime() - telemetry.timestamp.getTime()) < 3600000
      );

      if (!forecast) continue;

      const deviation = Math.abs(
        (telemetry.value - forecast.predictedValue) / forecast.predictedValue
      );

      if (deviation > 0.2) { // >20% deviation
        results.push({
          idSensorChannel: telemetry.channelId,
          detectedAt: new Date(),
          actualValue: telemetry.value,
          expectedValue: forecast.predictedValue,
          anomalyScore: deviation,
          anomalyGrade: this.calculateGrade(deviation),
          anomalyType: 'forecast_deviation',
          detectorId: 'fallback_forecast',
        });
      }
    }

    return results;
  }
}
```

---

## 5. Error Logging

### 5.1 Structured Logging

```typescript
// src/common/logger/ml-logger.ts

import { Logger } from '@nestjs/common';

export interface ErrorContext {
  service: string;
  operation: string;
  channelId?: string;
  detectorId?: string;
  attempt?: number;
  duration?: number;
  [key: string]: any;
}

export class MlLogger {
  private readonly logger = new Logger('ML');

  error(message: string, error: Error, context: ErrorContext): void {
    const logEntry = {
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      },
      context,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(JSON.stringify(logEntry));
  }

  warn(message: string, context: ErrorContext): void {
    const logEntry = {
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(JSON.stringify(logEntry));
  }

  info(message: string, context: Partial<ErrorContext>): void {
    const logEntry = {
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(JSON.stringify(logEntry));
  }
}
```

### 5.2 Error Tracking Table

```sql
-- Optional: Store critical errors for dashboard visibility
CREATE TABLE IF NOT EXISTS ml_error_log (
  id_error_log UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  service TEXT NOT NULL,
  operation TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE INDEX idx_error_log_type ON ml_error_log(error_type, occurred_at DESC);
CREATE INDEX idx_error_log_unresolved ON ml_error_log(resolved_at) WHERE resolved_at IS NULL;
```

---

## 6. Health Check

### 6.1 Service Health Endpoint

```typescript
// src/modules/ml/controllers/health.controller.ts

@Controller('ml/health')
export class MlHealthController {
  constructor(
    private opensearchService: OpenSearchService,
    private circuitBreakers: CircuitBreakers,
  ) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const checks = await Promise.allSettled([
      this.checkOpenSearch(),
      this.checkClickHouse(),
      this.checkPostgres(),
    ]);

    const services = {
      opensearch: this.parseCheck(checks[0]),
      clickhouse: this.parseCheck(checks[1]),
      postgres: this.parseCheck(checks[2]),
    };

    const overall = Object.values(services).every(s => s.status === 'healthy')
      ? 'healthy'
      : Object.values(services).some(s => s.status === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';

    return {
      status: overall,
      services,
      circuitBreakers: this.circuitBreakers.getAllStats(),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkOpenSearch(): Promise<boolean> {
    const response = await this.opensearchService.ping();
    return response === true;
  }

  private parseCheck(result: PromiseSettledResult<boolean>): ServiceStatus {
    if (result.status === 'fulfilled' && result.value) {
      return { status: 'healthy' };
    }
    return {
      status: 'unhealthy',
      error: result.status === 'rejected' ? result.reason.message : 'Check failed',
    };
  }
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceStatus>;
  circuitBreakers: object;
  timestamp: string;
}

interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  error?: string;
}
```

### 6.2 Health Check Response

```json
{
  "status": "degraded",
  "services": {
    "opensearch": {
      "status": "unhealthy",
      "error": "Connection refused"
    },
    "clickhouse": {
      "status": "healthy"
    },
    "postgres": {
      "status": "healthy"
    }
  },
  "circuitBreakers": {
    "opensearch": {
      "name": "opensearch",
      "state": "OPEN",
      "failures": 5,
      "nextAttempt": "2026-02-27T10:35:00Z"
    },
    "clickhouse": {
      "name": "clickhouse",
      "state": "CLOSED",
      "failures": 0
    },
    "smtp": {
      "name": "smtp",
      "state": "CLOSED",
      "failures": 0
    }
  },
  "timestamp": "2026-02-27T10:30:00Z"
}
```

---

## 7. Specific Error Handlers

### 7.1 OpenSearch Errors

```typescript
// src/modules/ml/errors/opensearch-error.handler.ts

export function handleOpenSearchError(error: any): never {
  // Connection errors
  if (error.code === 'ECONNREFUSED') {
    throw new ServiceUnavailableException(
      'OpenSearch is not reachable. Check network connectivity.'
    );
  }

  // Timeout
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    throw new ServiceUnavailableException(
      'OpenSearch request timed out. Cluster may be overloaded.'
    );
  }

  // Detector not found
  if (error.statusCode === 404) {
    throw new NotFoundException(
      `ML detector not found: ${error.meta?.body?.error?.reason || 'Unknown'}`
    );
  }

  // Too many requests
  if (error.statusCode === 429) {
    throw new TooManyRequestsException(
      'OpenSearch is rate limiting requests. Try again later.'
    );
  }

  // General error
  throw new InternalServerErrorException(
    `OpenSearch error: ${error.message}`
  );
}
```

### 7.2 ClickHouse Errors

```typescript
// src/modules/ml/errors/clickhouse-error.handler.ts

export function handleClickHouseError(error: any): never {
  // Timeout
  if (error.message?.includes('Code: 159')) {
    throw new ServiceUnavailableException(
      'ClickHouse query timed out. Consider optimizing query.'
    );
  }

  // Too many parts
  if (error.message?.includes('Code: 202')) {
    throw new ServiceUnavailableException(
      'ClickHouse has too many parts. Merges are behind.'
    );
  }

  // Memory limit
  if (error.message?.includes('Code: 241')) {
    throw new InternalServerErrorException(
      'ClickHouse memory limit exceeded. Reduce query scope.'
    );
  }

  throw new InternalServerErrorException(
    `ClickHouse error: ${error.message}`
  );
}
```

### 7.3 SMTP Errors

```typescript
// src/modules/notifications/errors/smtp-error.handler.ts

export async function handleSmtpError(
  error: any,
  notification: PendingNotification
): Promise<void> {
  // Queue for retry
  if (isRetryableSmtpError(error)) {
    await queueForRetry(notification, error);
    return;
  }

  // Permanent failure - log and skip
  if (isPermanentSmtpError(error)) {
    await logPermanentFailure(notification, error);
    return;
  }

  throw error;
}

function isRetryableSmtpError(error: any): boolean {
  const retryableCodes = [421, 450, 451, 452];
  return retryableCodes.some(code => 
    error.responseCode === code || error.message?.includes(`${code}`)
  );
}

function isPermanentSmtpError(error: any): boolean {
  const permanentCodes = [550, 551, 552, 553, 554];
  return permanentCodes.some(code =>
    error.responseCode === code || error.message?.includes(`${code}`)
  );
}
```

---

## 8. Error Recovery Jobs

### 8.1 Retry Failed Operations

```typescript
// src/modules/ml/jobs/error-recovery.job.ts

@Injectable()
export class ErrorRecoveryJob {
  private readonly logger = new Logger(ErrorRecoveryJob.name);

  constructor(
    private notificationRepo: Repository<PendingNotification>,
    private notificationService: NotificationService,
  ) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async retryFailedNotifications(): Promise<void> {
    const failed = await this.notificationRepo.find({
      where: {
        status: 'failed',
        retryCount: LessThan(3),
        lastAttempt: LessThan(new Date(Date.now() - 5 * 60000)),
      },
      take: 10,
    });

    for (const notification of failed) {
      try {
        await this.notificationService.send(notification);
        notification.status = 'sent';
      } catch (error) {
        notification.retryCount += 1;
        notification.lastAttempt = new Date();
        notification.lastError = error.message;
        
        if (notification.retryCount >= 3) {
          notification.status = 'permanently_failed';
        }
      }
      
      await this.notificationRepo.save(notification);
    }
  }
}
```

---

## 9. Error Responses

### 9.1 Standardized Error Format

```typescript
// src/common/filters/all-exceptions.filter.ts

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, code } = this.parseException(exception);

    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.headers['x-request-id'],
      },
    };

    response.status(status).json(errorResponse);
  }

  private parseException(exception: unknown): { 
    status: number; 
    message: string; 
    code: string;
  } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.message,
        code: this.getErrorCode(exception),
      };
    }

    // Circuit breaker error
    if (exception instanceof CircuitOpenError) {
      return {
        status: 503,
        message: exception.message,
        code: 'SERVICE_UNAVAILABLE',
      };
    }

    // Unknown error
    return {
      status: 500,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}
```

### 9.2 Error Response Examples

```json
// Service unavailable (circuit open)
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Circuit opensearch is OPEN. Try again later.",
    "timestamp": "2026-02-27T10:30:00Z",
    "path": "/ml/anomalies",
    "requestId": "abc-123"
  }
}

// Not found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Anomaly detector not found",
    "timestamp": "2026-02-27T10:30:00Z",
    "path": "/ml/detectors/xyz",
    "requestId": "abc-124"
  }
}

// Validation error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      { "field": "startDate", "message": "must be a valid date" }
    ],
    "timestamp": "2026-02-27T10:30:00Z",
    "path": "/ml/anomalies",
    "requestId": "abc-125"
  }
}
```

---

## 10. Monitoring & Alerts

### 10.1 Error Metrics

```typescript
// Track error rates for monitoring
@Injectable()
export class ErrorMetricsService {
  private errorCounts = new Map<string, number>();
  private lastReset = Date.now();

  recordError(service: string, operation: string): void {
    const key = `${service}:${operation}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  getErrorRate(service: string): number {
    const elapsed = (Date.now() - this.lastReset) / 60000; // minutes
    const count = this.getErrorCount(service);
    return count / Math.max(elapsed, 1); // errors per minute
  }

  @Cron('*/1 * * * *')
  checkErrorRates(): void {
    const threshold = 10; // errors per minute

    for (const [key, count] of this.errorCounts) {
      const rate = count / 1; // per minute
      if (rate > threshold) {
        this.alertHighErrorRate(key, rate);
      }
    }

    // Reset counters
    this.errorCounts.clear();
    this.lastReset = Date.now();
  }
}
```

---

## 11. Related Documents

- [07-SCHEDULER-CONFIG.md](07-SCHEDULER-CONFIG.md) - Scheduler jobs and error handling
- [08-ALERT-DEDUPLICATION.md](08-ALERT-DEDUPLICATION.md) - Alert deduplication
- [10-EMAIL-TEMPLATES.md](10-EMAIL-TEMPLATES.md) - Email templates
- [03-SERVICE-ARCHITECTURE.md](03-SERVICE-ARCHITECTURE.md) - Service architecture

---

**Next:** Email Templates
