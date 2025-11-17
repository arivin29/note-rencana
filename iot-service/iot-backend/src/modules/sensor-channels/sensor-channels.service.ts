import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import { SensorLog } from '../../entities/sensor-log.entity';
import { CreateSensorChannelDto } from './dto/create-sensor-channel.dto';
import { UpdateSensorChannelDto } from './dto/update-sensor-channel.dto';
import { SensorChannelResponseDto, SensorChannelDetailedResponseDto } from './dto/sensor-channel-response.dto';

@Injectable()
export class SensorChannelsService {
    constructor(
        @InjectRepository(SensorChannel)
        private readonly sensorChannelRepository: Repository<SensorChannel>,
        @InjectRepository(SensorLog)
        private readonly sensorLogRepository: Repository<SensorLog>,
    ) { }

    async create(createDto: CreateSensorChannelDto): Promise<SensorChannelResponseDto> {
        // Check if metric code already exists for this sensor
        const existing = await this.sensorChannelRepository.findOne({
            where: {
                idSensor: createDto.idSensor,
                metricCode: createDto.metricCode,
            },
        });

        if (existing) {
            throw new ConflictException(
                `Channel with metric code '${createDto.metricCode}' already exists for this sensor`,
            );
        }

        const channel = this.sensorChannelRepository.create(createDto);
        const saved = await this.sensorChannelRepository.save(channel);
        return this.toResponseDto(saved);
    }

    async findAll(params: {
        page?: number;
        limit?: number;
        search?: string;
        idSensor?: string;
        idSensorType?: string;
    }): Promise<{ data: SensorChannelResponseDto[]; total: number; page: number; limit: number }> {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 50));
        const skip = (page - 1) * limit;

        const where: FindOptionsWhere<SensorChannel> = {};

        if (params.idSensor) {
            where.idSensor = params.idSensor;
        }

        if (params.idSensorType) {
            where.idSensorType = params.idSensorType;
        }

        if (params.search) {
            where.metricCode = ILike(`%${params.search}%`);
        }

        const [items, total] = await this.sensorChannelRepository.findAndCount({
            where,
            relations: ['sensor'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return {
            data: items.map((item) => this.toResponseDto(item)),
            total,
            page,
            limit,
        };
    }

    async findOne(id: string): Promise<SensorChannelResponseDto> {
        const channel = await this.sensorChannelRepository.findOne({
            where: { idSensorChannel: id },
            relations: ['sensor'],
        });

        if (!channel) {
            throw new NotFoundException(`Sensor channel with ID ${id} not found`);
        }

        return this.toResponseDto(channel);
    }

    async findOneDetailed(id: string): Promise<SensorChannelDetailedResponseDto> {
        const channel = await this.sensorChannelRepository.findOne({
            where: { idSensorChannel: id },
            relations: ['sensor'],
        });

        if (!channel) {
            throw new NotFoundException(`Sensor channel with ID ${id} not found`);
        }

        return this.toDetailedResponseDto(channel);
    }

    async update(id: string, updateDto: UpdateSensorChannelDto): Promise<SensorChannelResponseDto> {
        const channel = await this.sensorChannelRepository.findOne({
            where: { idSensorChannel: id },
        });

        if (!channel) {
            throw new NotFoundException(`Sensor channel with ID ${id} not found`);
        }

        // Check metric code uniqueness if updating
        if (updateDto.metricCode && updateDto.metricCode !== channel.metricCode) {
            const existing = await this.sensorChannelRepository.findOne({
                where: {
                    idSensor: updateDto.idSensor ?? channel.idSensor,
                    metricCode: updateDto.metricCode,
                },
            });

            if (existing) {
                throw new ConflictException(
                    `Channel with metric code '${updateDto.metricCode}' already exists for this sensor`,
                );
            }
        }

        Object.assign(channel, updateDto);
        const updated = await this.sensorChannelRepository.save(channel);

        return this.toResponseDto(updated);
    }

    async remove(id: string): Promise<void> {
        const channel = await this.sensorChannelRepository.findOne({
            where: { idSensorChannel: id },
        });

        if (!channel) {
            throw new NotFoundException(`Sensor channel with ID ${id} not found`);
        }

        await this.sensorChannelRepository.remove(channel);
    }

    private toResponseDto(channel: SensorChannel): SensorChannelResponseDto {
        return {
            idSensorChannel: channel.idSensorChannel,
            idSensor: channel.idSensor,
            idSensorType: channel.idSensorType,
            metricCode: channel.metricCode,
            unit: channel.unit,
            minThreshold: channel.minThreshold,
            maxThreshold: channel.maxThreshold,
            multiplier: channel.multiplier,
            offsetValue: channel.offsetValue,
            registerAddress: channel.registerAddress,
            precision: channel.precision,
            aggregation: channel.aggregation,
            alertSuppressionWindow: channel.alertSuppressionWindow,
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt,
            sensor: channel.sensor ? {
                idSensor: channel.sensor.idSensor,
                label: channel.sensor.label,
            } : undefined,
            sensorType: channel.sensorType ? {
                idSensorType: channel.sensorType.idSensorType,
                category: channel.sensorType.category,
                defaultUnit: channel.sensorType.defaultUnit,
            } : undefined,
        };
    }

    private toDetailedResponseDto(channel: SensorChannel): SensorChannelDetailedResponseDto {
        const base = this.toResponseDto(channel);

        // TODO: Query sensor_logs for latest value and stats
        // For now, return base data
        return {
            ...base,
            latestValue: undefined, // Will be populated from sensor_logs query
            stats: undefined, // Will be populated from sensor_logs aggregation
        };
    }

    // Statistics & Aggregation Methods
    async getStatisticsOverview(): Promise<any> {
        const totalChannels = await this.sensorChannelRepository.count();
        const activeChannels = totalChannels; // Simplified - all channels considered active

        // Get channels by sensor type
        const channelsBySensorType = await this.sensorChannelRepository
            .createQueryBuilder('channel')
            .leftJoin('channel.sensorType', 'type')
            .select('type.category', 'category')
            .addSelect('COUNT(channel.idSensorChannel)', 'count')
            .where('type.category IS NOT NULL')
            .groupBy('type.category')
            .orderBy('COUNT(channel.idSensorChannel)', 'DESC')
            .getRawMany();

        const typeData = channelsBySensorType.map(item => ({
            category: item.category,
            count: parseInt(item.count),
            percentage: totalChannels > 0 ? (parseInt(item.count) / totalChannels) * 100 : 0,
        }));

        // Get channels by sensor
        const channelsBySensor = await this.sensorChannelRepository
            .createQueryBuilder('channel')
            .leftJoin('channel.sensor', 'sensor')
            .select('sensor.idSensor', 'idSensor')
            .addSelect('sensor.label', 'sensorCode')
            .addSelect('COUNT(channel.idSensorChannel)', 'channelCount')
            .where('sensor.label IS NOT NULL')
            .groupBy('sensor.idSensor')
            .addGroupBy('sensor.label')
            .orderBy('COUNT(channel.idSensorChannel)', 'DESC')
            .limit(10)
            .getRawMany();

        const sensorData = channelsBySensor.map(item => ({
            idSensor: item.idSensor,
            sensorCode: item.sensorCode,
            channelCount: parseInt(item.channelCount),
        }));

        // Threshold statistics
        const totalWithThresholds = await this.sensorChannelRepository
            .createQueryBuilder('channel')
            .where('channel.minThreshold IS NOT NULL OR channel.maxThreshold IS NOT NULL')
            .getCount();

        const minThresholdSet = await this.sensorChannelRepository
            .createQueryBuilder('channel')
            .where('channel.minThreshold IS NOT NULL')
            .getCount();

        const maxThresholdSet = await this.sensorChannelRepository
            .createQueryBuilder('channel')
            .where('channel.maxThreshold IS NOT NULL')
            .getCount();

        const bothThresholdsSet = await this.sensorChannelRepository
            .createQueryBuilder('channel')
            .where('channel.minThreshold IS NOT NULL AND channel.maxThreshold IS NOT NULL')
            .getCount();

        // Aggregation methods
        const aggregationMethods = await this.sensorChannelRepository
            .createQueryBuilder('channel')
            .select('channel.aggregation', 'method')
            .addSelect('COUNT(channel.idSensorChannel)', 'count')
            .where('channel.aggregation IS NOT NULL')
            .groupBy('channel.aggregation')
            .orderBy('COUNT(channel.idSensorChannel)', 'DESC')
            .getRawMany();

        const aggregationData = aggregationMethods.map(item => ({
            method: item.method,
            count: parseInt(item.count),
        }));

        return {
            totalChannels,
            activeChannels,
            channelsBySensorType: typeData,
            channelsBySensor: sensorData,
            thresholdOverview: {
                totalWithThresholds,
                minThresholdSet,
                maxThresholdSet,
                bothThresholdsSet,
            },
            aggregationMethods: aggregationData,
        };
    }

    async getReadings(
        id: string,
        startTime?: string,
        endTime?: string,
        aggregation?: string,
    ): Promise<any> {
        const startQueryTime = Date.now();

        // Query channel with sensor and node relations
        const channel = await this.sensorChannelRepository.findOne({
            where: { idSensorChannel: id },
            relations: ['sensor', 'sensor.node', 'sensorType'],
        });

        if (!channel) {
            throw new NotFoundException(`Sensor channel with ID ${id} not found`);
        }

        // Calculate time range (default: last 7 days)
        const endDate = endTime ? new Date(endTime) : new Date();
        const startDate = startTime
            ? new Date(startTime)
            : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

        // Query sensor_logs with time range
        const logs = await this.sensorLogRepository
            .createQueryBuilder('log')
            .where('log.id_sensor_channel = :channelId', { channelId: id })
            .andWhere('log.ts >= :startDate', { startDate })
            .andWhere('log.ts <= :endDate', { endDate })
            .orderBy('log.ts', 'ASC')
            .getMany();

        // Map to data points
        const dataPoints = logs.map(log => ({
            timestamp: log.ts,
            value: log.valueEngineered,
            quality: log.qualityFlag || 'good',
            rawValue: log.valueRaw,
        }));

        // Calculate statistics
        const values = dataPoints.map(dp => dp.value).filter(v => v !== null && v !== undefined);
        const statistics = {
            min: values.length > 0 ? Math.min(...values) : null,
            max: values.length > 0 ? Math.max(...values) : null,
            avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
            count: values.length,
            firstValue: values.length > 0 ? values[0] : null,
            lastValue: values.length > 0 ? values[values.length - 1] : null,
            stdDev: values.length > 0 ? this.calculateStdDev(values) : null,
        };

        // Channel metadata
        const channelInfo = {
            idSensorChannel: channel.idSensorChannel,
            metricCode: channel.metricCode,
            unit: channel.unit,
            minThreshold: channel.minThreshold,
            maxThreshold: channel.maxThreshold,
            precision: channel.precision,
            idSensorType: channel.idSensorType, // Add UUID for edit form
            sensorCode: channel.sensor?.label,
            sensorType: channel.sensorType?.category,
            nodeCode: channel.sensor?.node?.code,
        };

        const queryTimeMs = Date.now() - startQueryTime;

        return {
            channel: channelInfo,
            timeRange: {
                start: startDate,
                end: endDate,
                totalHours: (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60),
            },
            dataPoints,
            statistics,
            queryTimeMs,
        };
    }

    /**
     * Calculate standard deviation
     */
    private calculateStdDev(values: number[]): number {
        if (values.length === 0) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }
}
