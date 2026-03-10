import { Injectable } from '@angular/core';
import { HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces
export interface AnomalyResponse {
  idAnomalyResult: string;
  idSensorChannel: string;
  detectedAt: string;
  actualValue: number;
  expectedValue: number;
  anomalyScore: number;
  anomalyGrade: 'mild' | 'moderate' | 'severe' | 'critical';
  anomalyType: string;
  detectorName?: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  note?: string;
  sensorInfo?: {
    idSensorChannel: string;
    metricCode: string;
    unit: string;
  };
}

export interface ForecastResponse {
  idForecastResult: string;
  idSensorChannel: string;
  forecastTime: string;
  forecastValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  modelType: string;
  generatedAt: string;
  sensorInfo?: {
    idSensorChannel: string;
    metricCode: string;
    unit: string;
  };
}

export interface AnomalyQueryParams {
  idSensorChannel?: string;
  minGrade?: string;
  isAcknowledged?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ForecastQueryParams {
  idSensorChannel?: string;
  startDate?: string;
  endDate?: string;
  modelType?: string;
  limit?: number;
  offset?: number;
}

export interface DashboardSummary {
  anomalies: {
    total: number;
    critical: number;
    severe: number;
    moderate: number;
    mild: number;
    unacknowledged: number;
  };
  forecasts: {
    totalSensors: number;
    latestGeneratedAt?: string;
  };
  trends: {
    anomaliesLast24h: number;
    anomaliesLast7d: number;
    changePercent: number;
  };
}

export interface GradeSummary {
  grade: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class MlService {
  private baseUrl = `${environment.apiUrl}/ml`;

  constructor(private http: HttpClient) {}

  // ==================== ANOMALIES ====================

  /**
   * Get list of anomalies with optional filters
   */
  getAnomalies(params?: AnomalyQueryParams): Observable<AnomalyResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.idSensorChannel) httpParams = httpParams.set('idSensorChannel', params.idSensorChannel);
      if (params.minGrade) httpParams = httpParams.set('minGrade', params.minGrade);
      if (params.isAcknowledged !== undefined) httpParams = httpParams.set('isAcknowledged', String(params.isAcknowledged));
      if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
      if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
      if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
      if (params.offset) httpParams = httpParams.set('offset', String(params.offset));
    }

    return this.http.get<AnomalyResponse[]>(`${this.baseUrl}/anomalies`, { params: httpParams });
  }

  /**
   * Get single anomaly by ID
   */
  getAnomaly(id: string): Observable<AnomalyResponse> {
    return this.http.get<AnomalyResponse>(`${this.baseUrl}/anomalies/${id}`);
  }

  /**
   * Acknowledge an anomaly
   */
  acknowledgeAnomaly(id: string, note?: string): Observable<AnomalyResponse> {
    return this.http.post<AnomalyResponse>(`${this.baseUrl}/anomalies/${id}/acknowledge`, { note });
  }

  /**
   * Get anomaly summary by grade
   */
  getAnomalySummary(): Observable<GradeSummary[]> {
    return this.http.get<GradeSummary[]>(`${this.baseUrl}/anomalies/summary`);
  }

  // ==================== FORECASTS ====================

  /**
   * Get list of forecasts with optional filters
   */
  getForecasts(params?: ForecastQueryParams): Observable<ForecastResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.idSensorChannel) httpParams = httpParams.set('idSensorChannel', params.idSensorChannel);
      if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
      if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
      if (params.modelType) httpParams = httpParams.set('modelType', params.modelType);
      if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
      if (params.offset) httpParams = httpParams.set('offset', String(params.offset));
    }

    return this.http.get<ForecastResponse[]>(`${this.baseUrl}/forecasts`, { params: httpParams });
  }

  /**
   * Get latest forecast for a sensor
   */
  getLatestForecast(idSensorChannel: string): Observable<ForecastResponse> {
    return this.http.get<ForecastResponse>(`${this.baseUrl}/forecasts/latest/${idSensorChannel}`);
  }

  /**
   * Get forecast range for a sensor
   */
  getForecastRange(idSensorChannel: string, startDate: string, endDate: string): Observable<ForecastResponse[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ForecastResponse[]>(`${this.baseUrl}/forecasts/range/${idSensorChannel}`, { params });
  }

  // ==================== DASHBOARD ====================

  /**
   * Get ML dashboard summary
   */
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/summary`);
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Get dedup stats
   */
  getDedupStats(): Observable<{ activeKeys: number; totalAlertsSent: number }> {
    return this.http.get<{ activeKeys: number; totalAlertsSent: number }>(`/api/notifications/ml/dedup-stats`);
  }

  /**
   * Preview anomaly alert HTML
   */
  previewAlert(data: any): Observable<{ subject: string; html: string }> {
    return this.http.post<{ subject: string; html: string }>(`/api/notifications/ml/preview/alert`, data);
  }
}
