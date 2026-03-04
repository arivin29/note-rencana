import { Controller, Get, Post, Delete, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DetectorManagerService } from '../services/detector-manager.service';
import { MlOrchestrationService } from '../services/ml-orchestration.service';

/**
 * Controller for managing OpenSearch Anomaly Detection detectors
 * Provides REST API for creating, starting, stopping, and monitoring detectors
 */
@Controller('ml/detectors')
export class DetectorController {
  constructor(
    private readonly detectorManager: DetectorManagerService,
    private readonly mlOrchestration: MlOrchestrationService,
  ) {}

  /**
   * List all detectors
   * GET /ml/detectors
   */
  @Get()
  async listDetectors() {
    try {
      const detectors = await this.detectorManager.listDetectors();
      return {
        success: true,
        count: detectors.length,
        detectors,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get available detector types
   * GET /ml/detectors/types
   */
  @Get('types')
  getDetectorTypes() {
    const types = this.detectorManager.getAvailableDetectorTypes();
    return {
      success: true,
      types,
      configs: types.map((type) => ({
        metricCode: type,
        config: this.detectorManager.getDetectorConfig(type),
      })),
    };
  }

  /**
   * Manually trigger anomaly detection
   * POST /ml/detectors/run-detection
   */
  @Post('run-detection')
  async runDetection() {
    try {
      const result = await this.mlOrchestration.runAnomalyDetection();
      return {
        success: true,
        message: 'Anomaly detection completed',
        result,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get detector status by ID
   * GET /ml/detectors/:id
   */
  @Get(':id')
  async getDetectorStatus(@Param('id') id: string) {
    try {
      const status = await this.detectorManager.getDetectorStatus(id);
      if (!status) {
        throw new HttpException(
          { success: false, message: 'Detector not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, detector: status };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a detector for specific metric
   * POST /ml/detectors/:metricCode
   */
  @Post(':metricCode')
  async createDetector(@Param('metricCode') metricCode: string) {
    try {
      const result = await this.detectorManager.createDetector(metricCode);
      if (!result) {
        throw new HttpException(
          { success: false, message: 'Failed to create detector' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return {
        success: true,
        message: `Detector ${result.name} created`,
        detectorId: result.id,
        detectorName: result.name,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Create all predefined detectors
   * POST /ml/detectors/all/create
   */
  @Post('all/create')
  async createAllDetectors() {
    try {
      const result = await this.detectorManager.createAllDetectors();
      return {
        success: true,
        message: 'All detectors creation completed',
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Start a detector
   * POST /ml/detectors/:id/start
   */
  @Post(':id/start')
  async startDetector(@Param('id') id: string) {
    try {
      const success = await this.detectorManager.startDetector(id);
      if (!success) {
        throw new HttpException(
          { success: false, message: 'Failed to start detector' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return { success: true, message: `Detector ${id} started` };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Stop a detector
   * POST /ml/detectors/:id/stop
   */
  @Post(':id/stop')
  async stopDetector(@Param('id') id: string) {
    try {
      const success = await this.detectorManager.stopDetector(id);
      if (!success) {
        throw new HttpException(
          { success: false, message: 'Failed to stop detector' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return { success: true, message: `Detector ${id} stopped` };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Start all detectors
   * POST /ml/detectors/all/start
   */
  @Post('all/start')
  async startAllDetectors() {
    try {
      const result = await this.detectorManager.startAllDetectors();
      return {
        success: true,
        message: 'All detectors start completed',
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a detector
   * DELETE /ml/detectors/:id
   */
  @Delete(':id')
  async deleteDetector(@Param('id') id: string) {
    try {
      const success = await this.detectorManager.deleteDetector(id);
      if (!success) {
        throw new HttpException(
          { success: false, message: 'Failed to delete detector' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return { success: true, message: `Detector ${id} deleted` };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get detector results
   * GET /ml/detectors/:id/results
   */
  @Get(':id/results')
  async getDetectorResults(@Param('id') id: string) {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const results = await this.detectorManager.getDetectorResults(id, startTime, endTime, 50);
      return {
        success: true,
        count: results.length,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
        results,
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get historical detection results by metric code
   * GET /ml/detectors/historical/:metricCode
   */
  @Get('historical/:metricCode')
  async getHistoricalResults(@Param('metricCode') metricCode: string) {
    try {
      // Get all anomalies (grade > 0) from historical detection 
      const results = await this.detectorManager.getHistoricalResults(metricCode, 100, 0);

      return {
        success: true,
        metricCode,
        anomaliesCount: results.length,
        anomalies: results.map((a) => ({
          grade: a.anomaly_grade,
          score: a.anomaly_score,
          confidence: a.confidence,
          startTime: a.data_start_time,
          endTime: a.data_end_time,
          entity: a.entity,
          threshold: a.threshold,
          index: a.index,
        })),
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
