import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorLog } from '../../entities/sensor-log.entity';
import { ScadaNodeBinding } from '../../entities/scada-node-binding.entity';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaAccessService, ScadaRequestUser } from './scada-access.service';
import { ScadaMapperService } from './scada-mapper.service';
import { ScadaRuntimeResponseDto } from './dto';

interface LatestRuntimeRow {
  sensorChannelId: string;
  sensorTypeId: string | null;
  category: string | null;
  unit: string | null;
  precision: number | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  timestamp: Date | null;
  value: number | null;
  rawValue: number | null;
  qualityFlag: string | null;
}

@Injectable()
export class ScadaRuntimeService {
  constructor(
    @InjectRepository(ScadaDiagram)
    private readonly scadaDiagramRepository: Repository<ScadaDiagram>,
    @InjectRepository(ScadaNodeBinding)
    private readonly scadaNodeBindingRepository: Repository<ScadaNodeBinding>,
    @InjectRepository(SensorLog)
    private readonly sensorLogRepository: Repository<SensorLog>,
    private readonly scadaAccessService: ScadaAccessService,
    private readonly scadaMapperService: ScadaMapperService,
  ) {}

  async getDiagramRuntime(diagramId: string, user: ScadaRequestUser): Promise<ScadaRuntimeResponseDto> {
    const diagram = await this.scadaAccessService.getDiagramOrFail(diagramId);
    this.scadaAccessService.assertDiagramAccess(diagram, user);

    const bindings = await this.scadaNodeBindingRepository.find({
      where: {
        node: {
          idScadaDiagram: diagramId,
          isActive: true,
        },
        isActive: true,
      },
      relations: ['node'],
      order: {
        priorityOrder: 'ASC',
      },
    });

    const channelIds = [...new Set(bindings.map((binding) => binding.idSensorChannel))];
    const latestRows = channelIds.length > 0 ? await this.getLatestTelemetry(channelIds) : [];
    const latestByChannel = new Map(latestRows.map((row) => [row.sensorChannelId, row]));

    return {
      diagramId,
      polledAt: new Date(),
      bindings: bindings.map((binding) => {
        const latest = latestByChannel.get(binding.idSensorChannel);
        const freshnessState = this.resolveFreshnessState(latest);
        return this.scadaMapperService.toRuntimeBinding(binding, {
          ...latest,
          status: this.resolveRuntimeStatus(latest),
          connectivityState: freshnessState === 'offline' ? 'offline' : 'online',
          freshnessState,
        });
      }),
      summary: this.buildSummary(bindings.map((binding) => latestByChannel.get(binding.idSensorChannel))),
    };
  }

  private async getLatestTelemetry(channelIds: string[]): Promise<LatestRuntimeRow[]> {
    const rows = await this.sensorLogRepository.query(
      `
        SELECT DISTINCT ON (log.id_sensor_channel)
          log.id_sensor_channel AS "sensorChannelId",
          channel.id_sensor_type AS "sensorTypeId",
          type.category AS "category",
          COALESCE(channel.unit, type.default_unit) AS "unit",
          COALESCE(channel.precision, type.precision) AS "precision",
          channel.min_threshold AS "minThreshold",
          channel.max_threshold AS "maxThreshold",
          log.ts AS "timestamp",
          log.value_engineered AS "value",
          log.value_raw AS "rawValue",
          log.quality_flag AS "qualityFlag"
        FROM sensor_logs log
        INNER JOIN sensor_channels channel
          ON channel.id_sensor_channel = log.id_sensor_channel
        LEFT JOIN sensor_types type
          ON type.id_sensor_type = channel.id_sensor_type
        WHERE log.id_sensor_channel = ANY($1::uuid[])
        ORDER BY log.id_sensor_channel, log.ts DESC, log.id_sensor_log DESC
      `,
      [channelIds],
    );

    return rows.map((row: any) => ({
      sensorChannelId: row.sensorChannelId,
      sensorTypeId: row.sensorTypeId,
      category: row.category,
      unit: row.unit,
      precision: row.precision !== null ? Number(row.precision) : null,
      minThreshold: row.minThreshold !== null ? Number(row.minThreshold) : null,
      maxThreshold: row.maxThreshold !== null ? Number(row.maxThreshold) : null,
      timestamp: row.timestamp ? new Date(row.timestamp) : null,
      value: row.value !== null ? Number(row.value) : null,
      rawValue: row.rawValue !== null ? Number(row.rawValue) : null,
      qualityFlag: row.qualityFlag,
    }));
  }

  private resolveRuntimeStatus(latest?: LatestRuntimeRow): string {
    if (!latest || !latest.timestamp) {
      return 'unknown';
    }

    const ageMs = Date.now() - latest.timestamp.getTime();

    if (ageMs > 15 * 60 * 1000) {
      return 'offline';
    }

    if (ageMs > 5 * 60 * 1000) {
      return 'stale';
    }

    if (this.isOffState(latest)) {
      return 'off';
    }

    if (this.isAlertState(latest)) {
      return 'alert';
    }

    if (latest.qualityFlag && latest.qualityFlag !== 'good') {
      return 'warn';
    }

    return 'ok';
  }

  private resolveFreshnessState(latest?: LatestRuntimeRow): string {
    if (!latest || !latest.timestamp) {
      return 'unknown';
    }

    const ageMs = Date.now() - latest.timestamp.getTime();

    if (ageMs > 15 * 60 * 1000) {
      return 'offline';
    }

    if (ageMs > 5 * 60 * 1000) {
      return 'stale';
    }

    return 'fresh';
  }

  private buildSummary(latestRows: Array<LatestRuntimeRow | undefined>) {
    const freshness = latestRows.map((row) => this.resolveFreshnessState(row));

    return {
      totalBindings: latestRows.length,
      offlineBindings: freshness.filter((state) => state === 'offline').length,
      staleBindings: freshness.filter((state) => state === 'stale').length,
    };
  }

  private isAlertState(latest: LatestRuntimeRow): boolean {
    if (latest.value === null || latest.value === undefined) {
      return false;
    }

    if (latest.maxThreshold !== null && latest.value > latest.maxThreshold) {
      return true;
    }

    if (latest.minThreshold !== null && latest.value < latest.minThreshold) {
      return true;
    }

    return false;
  }

  private isOffState(latest: LatestRuntimeRow): boolean {
    if (latest.value === null || latest.value === undefined) {
      return false;
    }

    if (latest.value !== 0) {
      return false;
    }

    const offCategories = new Set(['status', 'state', 'boolean', 'switch', 'relay', 'power']);
    return latest.category ? offCategories.has(latest.category.toLowerCase()) : false;
  }
}
