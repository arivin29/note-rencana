import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnomaliesService } from '../services/anomalies.service';
import { ForecastsService } from '../services/forecasts.service';

interface MlDashboardSummary {
  anomalies: {
    total: number;
    critical: number;
    severe: number;
    moderate: number;
    mild: number;
    unacknowledged: number;
    lastDetectedAt: Date | null;
    affectedSensors: number;
    affectedNodes: number;
  };
  forecasts: {
    availableChannels: number;
  };
  health: {
    mlServiceStatus: 'healthy' | 'degraded' | 'unknown';
    lastSyncTime: Date | null;
  };
}

@ApiTags('ML - Dashboard')
@Controller('ml/dashboard')
export class MlDashboardController {
  constructor(
    private readonly anomaliesService: AnomaliesService,
    private readonly forecastsService: ForecastsService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get ML dashboard summary' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiQuery({ name: 'hours', required: false, description: 'Lookback hours (default: 24)' })
  @ApiResponse({ status: 200 })
  async getSummary(
    @Query('ownerId') ownerId?: string,
    @Query('hours') hours?: string,
  ): Promise<MlDashboardSummary> {
    const lookbackHours = hours ? parseInt(hours, 10) : 24;
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - lookbackHours);

    // Get anomaly summary
    const anomalySummary = await this.anomaliesService.getSummary({
      ownerId,
      startDate: startDate.toISOString(),
    });

    // Get available forecast channels
    const forecastChannels = await this.forecastsService.getAvailableChannels(ownerId);

    return {
      anomalies: {
        total: anomalySummary.totalAnomalies,
        critical: anomalySummary.criticalCount,
        severe: anomalySummary.severeCount,
        moderate: anomalySummary.moderateCount,
        mild: anomalySummary.mildCount,
        unacknowledged: anomalySummary.unacknowledgedCount,
        lastDetectedAt: anomalySummary.lastDetectedAt,
        affectedSensors: anomalySummary.affectedSensors,
        affectedNodes: anomalySummary.affectedNodes,
      },
      forecasts: {
        availableChannels: forecastChannels.length,
      },
      health: {
        mlServiceStatus: 'healthy', // TODO: Check actual iot-gtw ML service health
        lastSyncTime: null, // TODO: Get from sync status
      },
    };
  }

  @Get('anomaly-trend')
  @ApiOperation({ summary: 'Get anomaly trend over time' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Lookback days (default: 7)' })
  @ApiQuery({ name: 'granularity', required: false, enum: ['hour', 'day'], description: 'Granularity (default: day)' })
  @ApiResponse({ status: 200 })
  async getAnomalyTrend(
    @Query('ownerId') ownerId?: string,
    @Query('days') days?: string,
    @Query('granularity') granularity?: 'hour' | 'day',
  ) {
    // This would query anomaly counts grouped by time
    // For now, return placeholder
    const lookbackDays = days ? parseInt(days, 10) : 7;
    const gran = granularity || 'day';

    // TODO: Implement actual trend calculation
    const trend: Array<{ timestamp: Date; count: number; grade: string }> = [];

    return {
      startDate: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      granularity: gran,
      data: trend,
    };
  }

  @Get('top-anomalous-sensors')
  @ApiOperation({ summary: 'Get sensors with most anomalies' })
  @ApiQuery({ name: 'ownerId', required: false, description: 'Filter by owner ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of sensors (default: 10)' })
  @ApiQuery({ name: 'hours', required: false, description: 'Lookback hours (default: 24)' })
  @ApiResponse({ status: 200 })
  async getTopAnomalousSensors(
    @Query('ownerId') ownerId?: string,
    @Query('limit') limit?: string,
    @Query('hours') hours?: string,
  ) {
    // TODO: Implement actual ranking
    return {
      period: {
        hours: hours ? parseInt(hours, 10) : 24,
      },
      sensors: [],
    };
  }
}
