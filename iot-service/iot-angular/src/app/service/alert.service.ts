import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AlertEventsService } from '../../sdk/core/services';
import { AuthService } from '../services/auth.service';

export interface AlertStatistics {
  open: number;
  acknowledged: number;
  cleared: number;
  total: number;
  dateRange: string;
}

export interface OfflineNodesSummary {
  warning: number;
  critical: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  constructor(
    private alertEventsService: AlertEventsService,
    private authService: AuthService
  ) {}

  /**
   * Get alert statistics (open, acknowledged, cleared counts)
   * @param dateRange - e.g., '7d', '30d', '90d'
   * @param ownerId - Optional owner ID for filtering (null for super admin)
   */
  getAlertStatistics(dateRange: string = '7d', ownerId?: string | null): Observable<any> {
    return this.alertEventsService.alertEventsControllerGetStatistics({
      dateRange,
      ownerId: ownerId || undefined
    } as any);
  }

  /**
   * Get offline nodes summary (warning, critical counts)
   * @param ownerId - Optional owner ID for filtering (null for super admin)
   */
  getOfflineNodesSummary(ownerId?: string | null): Observable<any> {
    return this.alertEventsService.alertEventsControllerGetOfflineNodesSummary({
      ownerId: ownerId || undefined
    } as any);
  }

  /**
   * Get all alert events with filters
   * @param filters - Filter options including ownerId
   */
  getAlertEvents(filters?: {
    page?: number;
    limit?: number;
    idAlertRule?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    ownerId?: string | null;
  }): Observable<any> {
    return this.alertEventsService.alertEventsControllerFindAll({
      page: filters?.page,
      limit: filters?.limit,
      idAlertRule: filters?.idAlertRule,
      status: filters?.status,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      ownerId: filters?.ownerId || undefined
    } as any);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string, note?: string): Observable<any> {
    const user = this.authService.currentUserValue;
    return this.alertEventsService.alertEventsControllerAcknowledge({
      id,
      body: {
        acknowledgedBy: user?.idUser || '',
        note
      }
    });
  }

  /**
   * Clear an alert
   */
  clearAlert(id: string, note?: string): Observable<any> {
    const user = this.authService.currentUserValue;
    return this.alertEventsService.alertEventsControllerClear({
      id,
      body: {
        clearedBy: user?.idUser || '',
        note
      }
    });
  }
}
