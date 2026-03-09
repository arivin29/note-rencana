import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { CoreGeoJsonService, CoreGeoJSONResponse } from '../services/core-geojson.service';

class CoreGeoJsonResponseDto {
  @ApiProperty()
  type: string;
  
  @ApiProperty({ type: [Object] })
  features: any[];
}

class SensorTypeDto {
  @ApiProperty()
  id: string;
  
  @ApiProperty()
  name: string;
  
  @ApiProperty()
  code: string;
  
  @ApiProperty()
  icon: string;
  
  @ApiProperty()
  unit: string;
  
  @ApiProperty()
  position: number;
  
  @ApiProperty()
  channelCount: number;
}

class NodesWithoutCoordsDto {
  @ApiProperty()
  total: number;
  
  @ApiProperty()
  withoutCoords: number;
  
  @ApiProperty({ type: [Object] })
  nodes: any[];
}

class SensorChannelValueDto {
  channelId: string;
  metricCode: string;
  unit: string;
  sensorLabel: string;
  sensorTypeName: string;
  sensorTypeIcon: string;
  value: number | null;
  valueRaw: number | null;
  timestamp: string;
  qualityFlag: string;
  minThreshold: number | null;
  maxThreshold: number | null;
  status: 'normal' | 'warning' | 'critical' | 'unknown';
}

class NodeSensorValuesDto {
  nodeId: string;
  nodeCode: string;
  nodeName: string;
  latitude: number;
  longitude: number;
  hasCoordinates: boolean;
  channels: SensorChannelValueDto[];
}

class SensorChannelDto {
  id: string;
  metricCode: string;
  unit: string;
  typeName: string;
  typeIcon: string;
  value: number;
  valueRaw: number;
  lastUpdate: string;
  qualityFlag: string;
  minThreshold: number;
  maxThreshold: number;
  status: string;
}

class NodeSensorDto {
  id: string;
  code: string;
  label: string;
  status: string;
  channels: SensorChannelDto[];
}

@ApiTags('WebGIS - Core GeoJSON')
@ApiBearerAuth()
@Controller('webgis/core')
export class CoreGeoJsonController {
  constructor(private readonly coreGeoJsonService: CoreGeoJsonService) {}

  @Get(':projectId/nodes')
  @ApiOperation({ summary: 'Get all nodes as GeoJSON for a project' })
  @ApiResponse({ status: 200, description: 'GeoJSON FeatureCollection of nodes', type: CoreGeoJsonResponseDto })
  async getNodesGeoJson(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<CoreGeoJSONResponse> {
    return this.coreGeoJsonService.getNodesGeoJson(projectId);
  }

  @Get(':projectId/sensors')
  @ApiOperation({ summary: 'Get all sensors as GeoJSON for a project' })
  @ApiResponse({ status: 200, description: 'GeoJSON FeatureCollection of sensors', type: CoreGeoJsonResponseDto })
  async getSensorsGeoJson(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<CoreGeoJSONResponse> {
    return this.coreGeoJsonService.getSensorsGeoJson(projectId);
  }

  @Get(':projectId/alerts')
  @ApiOperation({ summary: 'Get active alerts as GeoJSON for a project' })
  @ApiResponse({ status: 200, description: 'GeoJSON FeatureCollection of active alerts', type: CoreGeoJsonResponseDto })
  async getAlertsGeoJson(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<CoreGeoJSONResponse> {
    return this.coreGeoJsonService.getAlertsGeoJson(projectId);
  }

  @Get(':projectId/nodes/missing-coordinates')
  @ApiOperation({ summary: 'Get list of nodes without coordinates' })
  @ApiResponse({ status: 200, description: 'List of nodes without coordinates', type: NodesWithoutCoordsDto })
  async getNodesWithoutCoordinates(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ total: number; withoutCoords: number; nodes: any[] }> {
    return this.coreGeoJsonService.getNodesWithoutCoordinates(projectId);
  }

  @Get(':projectId/sensor-channel-values')
  @ApiOperation({ summary: 'Get latest sensor channel values grouped by node for map display' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of nodes with their sensor channels and latest values',
    type: [NodeSensorValuesDto]
  })
  async getSensorChannelValues(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<any[]> {
    return this.coreGeoJsonService.getSensorChannelValues(projectId);
  }

  @Get('node/:nodeId/sensors')
  @ApiOperation({ summary: 'Get sensors with channels for a specific node' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of sensors with channels for the node',
    type: [NodeSensorDto]
  })
  async getNodeSensors(
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ): Promise<any[]> {
    return this.coreGeoJsonService.getNodeSensors(nodeId);
  }

  @Get(':projectId/sensor-types')
  @ApiOperation({ summary: 'Get available sensor types for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of sensor types available in the project',
    type: [SensorTypeDto]
  })
  async getSensorTypes(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<any[]> {
    return this.coreGeoJsonService.getSensorTypes(projectId);
  }

  @Get(':projectId/sensor-channels')
  @ApiOperation({ summary: 'Get sensor channels as GeoJSON for a project' })
  @ApiQuery({ 
    name: 'sensorTypeId', 
    required: false, 
    description: 'Filter by sensor type ID' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'GeoJSON FeatureCollection of sensor channels', 
    type: CoreGeoJsonResponseDto 
  })
  async getSensorChannelsGeoJson(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('sensorTypeId') sensorTypeId?: string,
  ): Promise<CoreGeoJSONResponse> {
    // Validate sensorTypeId is a valid UUID if provided
    if (sensorTypeId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sensorTypeId)) {
        sensorTypeId = undefined; // Ignore invalid UUID
      }
    }
    return this.coreGeoJsonService.getSensorChannelsGeoJson(projectId, sensorTypeId);
  }
}
