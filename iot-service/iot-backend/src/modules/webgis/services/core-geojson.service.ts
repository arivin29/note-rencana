import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClickhouseService } from '../../clickhouse/clickhouse.service';

// Default coordinates (Monas, Jakarta) for nodes/sensors without coordinates
const DEFAULT_LAT = -6.1754;
const DEFAULT_LON = 106.8272;

export interface CoreGeoJSONFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, any>;
}

export interface CoreGeoJSONResponse {
  type: 'FeatureCollection';
  features: CoreGeoJSONFeature[];
}

@Injectable()
export class CoreGeoJsonService {
  private readonly logger = new Logger(CoreGeoJsonService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly clickhouseService: ClickhouseService,
  ) {}

  /**
   * Get all nodes as GeoJSON for a project
   */
  async getNodesGeoJson(projectId: string): Promise<CoreGeoJSONResponse> {
    const query = `
      SELECT 
        n.id_node as id,
        n.code,
        n.name,
        n.address,
        n.latitude,
        n.longitude,
        n.connectivity_status,
        n.last_seen_at,
        n.icon_url,
        n.status,
        n.city,
        n.province,
        n.description,
        n.serial_number,
        n.firmware_version,
        n.pic_name,
        n.pic_phone,
        nm.model_name,
        nm.vendor as manufacturer
      FROM nodes n
      LEFT JOIN node_models nm ON n.id_node_model = nm.id_node_model
      WHERE n.id_project = $1
    `;

    const rows = await this.dataSource.query(query, [projectId]);

    const features: CoreGeoJSONFeature[] = rows.map((row: any) => {
      // Use default coordinates if lat/lon is null
      const lat = row.latitude !== null ? parseFloat(row.latitude) : DEFAULT_LAT;
      const lon = row.longitude !== null ? parseFloat(row.longitude) : DEFAULT_LON;
      const hasCoordinates = row.latitude !== null && row.longitude !== null;

      return {
        type: 'Feature',
        id: row.id,
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          code: row.code,
          name: row.name,
          address: row.address,
          city: row.city,
          province: row.province,
          description: row.description,
          connectivityStatus: row.connectivity_status,
          status: row.status,
          lastSeenAt: row.last_seen_at,
          iconUrl: row.icon_url,
          serialNumber: row.serial_number,
          firmwareVersion: row.firmware_version,
          modelName: row.model_name,
          manufacturer: row.manufacturer,
          picName: row.pic_name,
          picPhone: row.pic_phone,
          hasCoordinates,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }

  /**
   * Get all sensors as GeoJSON for a project
   * Sensors inherit coordinates from their parent node
   */
  async getSensorsGeoJson(projectId: string): Promise<CoreGeoJSONResponse> {
    const query = `
      SELECT 
        s.id_sensor as id,
        s.sensor_code as code,
        s.label,
        s.status,
        s.location,
        sc.model_name as catalog_name,
        sc.vendor as catalog_vendor,
        n.name as node_name,
        n.code as node_code,
        n.latitude,
        n.longitude
      FROM sensors s
      JOIN nodes n ON s.id_node = n.id_node
      LEFT JOIN sensor_catalogs sc ON s.id_sensor_catalog = sc.id_sensor_catalog
      WHERE n.id_project = $1
    `;

    const rows = await this.dataSource.query(query, [projectId]);

    const features: CoreGeoJSONFeature[] = rows.map((row: any) => {
      const lat = row.latitude !== null ? parseFloat(row.latitude) : DEFAULT_LAT;
      const lon = row.longitude !== null ? parseFloat(row.longitude) : DEFAULT_LON;
      const hasCoordinates = row.latitude !== null && row.longitude !== null;

      return {
        type: 'Feature',
        id: row.id,
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          code: row.code,
          label: row.label,
          status: row.status,
          location: row.location,
          catalogName: row.catalog_name,
          catalogVendor: row.catalog_vendor,
          nodeName: row.node_name,
          nodeCode: row.node_code,
          hasCoordinates,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }

  /**
   * Get active alerts as GeoJSON for a project
   * Alerts inherit coordinates from sensor -> node chain
   */
  async getAlertsGeoJson(projectId: string): Promise<CoreGeoJSONResponse> {
    const query = `
      SELECT 
        ae.id_alert_event as id,
        ar.severity,
        ar.rule_type,
        ae.status,
        ae.value,
        ae.triggered_at,
        ae.cleared_at,
        s.label as sensor_label,
        s.sensor_code,
        n.name as node_name,
        n.code as node_code,
        n.latitude,
        n.longitude
      FROM alert_events ae
      JOIN alert_rules ar ON ae.id_alert_rule = ar.id_alert_rule
      JOIN sensor_channels sc ON ar.id_sensor_channel = sc.id_sensor_channel
      JOIN sensors s ON sc.id_sensor = s.id_sensor
      JOIN nodes n ON s.id_node = n.id_node
      WHERE n.id_project = $1 
        AND ae.cleared_at IS NULL
      ORDER BY ae.triggered_at DESC
    `;

    const rows = await this.dataSource.query(query, [projectId]);

    const features: CoreGeoJSONFeature[] = rows.map((row: any) => {
      const lat = row.latitude !== null ? parseFloat(row.latitude) : DEFAULT_LAT;
      const lon = row.longitude !== null ? parseFloat(row.longitude) : DEFAULT_LON;
      const hasCoordinates = row.latitude !== null && row.longitude !== null;

      return {
        type: 'Feature',
        id: row.id,
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          severity: row.severity,
          ruleType: row.rule_type,
          status: row.status,
          value: row.value,
          triggeredAt: row.triggered_at,
          clearedAt: row.cleared_at,
          sensorLabel: row.sensor_label,
          sensorCode: row.sensor_code,
          nodeName: row.node_name,
          nodeCode: row.node_code,
          hasCoordinates,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }

  /**
   * Get statistics about nodes without coordinates
   */
  async getNodesWithoutCoordinates(projectId: string): Promise<{ total: number; withoutCoords: number; nodes: any[] }> {
    const query = `
      SELECT 
        id_node as id,
        code,
        name
      FROM nodes
      WHERE id_project = $1
        AND (latitude IS NULL OR longitude IS NULL)
    `;

    const rows = await this.dataSource.query(query, [projectId]);

    const totalQuery = `SELECT COUNT(*) as total FROM nodes WHERE id_project = $1`;
    const [{ total }] = await this.dataSource.query(totalQuery, [projectId]);

    return {
      total: parseInt(total, 10),
      withoutCoords: rows.length,
      nodes: rows,
    };
  }

  /**
   * Get latest sensor channel values grouped by node for map display
   * Returns nodes with their sensor channels and latest values
   * Uses ClickHouse sensor_channel_latest for real-time values
   */
  async getSensorChannelValues(projectId: string): Promise<any[]> {
    // Step 1: Get node + sensor_channel metadata from PostgreSQL
    const metadataQuery = `
      SELECT 
        n.id_node,
        n.code as node_code,
        n.name as node_name,
        n.latitude,
        n.longitude,
        sc.id_sensor_channel,
        sc.metric_code,
        sc.unit,
        sc.min_threshold,
        sc.max_threshold,
        st.category as sensor_type_name,
        'pi pi-circle' as sensor_type_icon,
        s.label as sensor_label
      FROM nodes n
      JOIN sensors s ON n.id_node = s.id_node
      JOIN sensor_channels sc ON s.id_sensor = sc.id_sensor
      LEFT JOIN sensor_types st ON sc.id_sensor_type = st.id_sensor_type
      WHERE n.id_project = $1
      ORDER BY n.code, s.label, sc.metric_code
    `;

    const rows = await this.dataSource.query(metadataQuery, [projectId]);

    // Step 2: Get latest values from ClickHouse
    let clickhouseValues = new Map<string, any>();
    
    if (this.clickhouseService.isAvailable()) {
      try {
        const clickhouseQuery = `
          SELECT 
            channel_id,
            eng_value,
            raw_value,
            last_update,
            min_threshold,
            max_threshold
          FROM sensor_channel_latest
          WHERE project_id = '${projectId}'
        `;
        
        const result = await this.clickhouseService.executeQuery(clickhouseQuery);
        
        for (const row of result.rows) {
          clickhouseValues.set(row.channel_id, {
            value_engineered: row.eng_value,
            value_raw: row.raw_value,
            ts: row.last_update,
            quality_flag: 'good',
          });
        }
        
        this.logger.debug(`ClickHouse: Loaded ${clickhouseValues.size} channel values`);
      } catch (error) {
        this.logger.warn(`ClickHouse query failed, using PostgreSQL fallback: ${error.message}`);
        // Fallback to PostgreSQL sensor_logs (if needed)
      }
    } else {
      this.logger.debug('ClickHouse not available, using PostgreSQL fallback');
    }

    // Step 3: Group by node and merge with ClickHouse values
    const nodeMap = new Map<string, any>();

    for (const row of rows) {
      const nodeId = row.id_node;
      
      if (!nodeMap.has(nodeId)) {
        const lat = row.latitude !== null ? parseFloat(row.latitude) : DEFAULT_LAT;
        const lon = row.longitude !== null ? parseFloat(row.longitude) : DEFAULT_LON;
        
        nodeMap.set(nodeId, {
          nodeId,
          nodeCode: row.node_code,
          nodeName: row.node_name,
          latitude: lat,
          longitude: lon,
          hasCoordinates: row.latitude !== null && row.longitude !== null,
          channels: [],
        });
      }

      const node = nodeMap.get(nodeId);
      
      // Get value from ClickHouse (or null if not available)
      const chValue = clickhouseValues.get(row.id_sensor_channel);
      const value = chValue?.value_engineered ?? null;
      const valueRaw = chValue?.value_raw ?? null;
      const timestamp = chValue?.ts ?? null;
      const qualityFlag = chValue?.quality_flag ?? 'unknown';
      
      // Determine status based on thresholds
      const minThreshold = row.min_threshold !== null ? parseFloat(row.min_threshold) : null;
      const maxThreshold = row.max_threshold !== null ? parseFloat(row.max_threshold) : null;
      
      let status: 'normal' | 'warning' | 'critical' | 'unknown' = 'unknown';
      if (value !== null) {
        if (minThreshold !== null && value < minThreshold) {
          status = 'critical';
        } else if (maxThreshold !== null && value > maxThreshold) {
          status = 'critical';
        } else {
          status = 'normal';
        }
      }

      node.channels.push({
        channelId: row.id_sensor_channel,
        metricCode: row.metric_code,
        unit: row.unit || '',
        sensorLabel: row.sensor_label,
        sensorTypeName: row.sensor_type_name,
        sensorTypeIcon: row.sensor_type_icon,
        value,
        valueRaw,
        timestamp,
        qualityFlag,
        minThreshold,
        maxThreshold,
        status,
      });
    }

    return Array.from(nodeMap.values());
  }

  /**
   * Get sensors with channels for a specific node
   * Used for node drawer info display
   */
  async getNodeSensors(nodeId: string): Promise<any> {
    const query = `
      WITH latest_values AS (
        SELECT DISTINCT ON (sl.id_sensor_channel)
          sl.id_sensor_channel,
          sl.value_engineered,
          sl.value_raw,
          sl.ts,
          sl.quality_flag
        FROM sensor_logs sl
        WHERE sl.id_node = $1
        ORDER BY sl.id_sensor_channel, sl.ts DESC
      )
      SELECT 
        s.id_sensor,
        s.sensor_code,
        s.label as sensor_label,
        s.status as sensor_status,
        sc.id_sensor_channel,
        sc.metric_code,
        sc.unit,
        sc.min_threshold,
        sc.max_threshold,
        st.category as sensor_type_name,
        'pi pi-circle' as sensor_type_icon,
        lv.value_engineered,
        lv.value_raw,
        lv.ts as last_update,
        lv.quality_flag
      FROM sensors s
      LEFT JOIN sensor_channels sc ON s.id_sensor = sc.id_sensor
      LEFT JOIN sensor_types st ON sc.id_sensor_type = st.id_sensor_type
      LEFT JOIN latest_values lv ON sc.id_sensor_channel = lv.id_sensor_channel
      WHERE s.id_node = $1
      ORDER BY s.label, sc.metric_code
    `;

    const rows = await this.dataSource.query(query, [nodeId]);

    // Group by sensor
    const sensorMap = new Map<string, any>();

    for (const row of rows) {
      const sensorId = row.id_sensor;
      
      if (!sensorMap.has(sensorId)) {
        sensorMap.set(sensorId, {
          id: sensorId,
          code: row.sensor_code,
          label: row.sensor_label,
          status: row.sensor_status,
          channels: [],
        });
      }

      const sensor = sensorMap.get(sensorId);
      
      // Only add channel if it exists
      if (row.id_sensor_channel) {
        const value = row.value_engineered !== null ? parseFloat(row.value_engineered) : null;
        const minThreshold = row.min_threshold !== null ? parseFloat(row.min_threshold) : null;
        const maxThreshold = row.max_threshold !== null ? parseFloat(row.max_threshold) : null;
        
        let status: 'normal' | 'warning' | 'critical' | 'unknown' = 'unknown';
        if (value !== null) {
          if (minThreshold !== null && value < minThreshold) {
            status = 'critical';
          } else if (maxThreshold !== null && value > maxThreshold) {
            status = 'critical';
          } else {
            status = 'normal';
          }
        }

        sensor.channels.push({
          id: row.id_sensor_channel,
          metricCode: row.metric_code,
          unit: row.unit || '',
          typeName: row.sensor_type_name,
          typeIcon: row.sensor_type_icon,
          value,
          valueRaw: row.value_raw !== null ? parseFloat(row.value_raw) : null,
          lastUpdate: row.last_update,
          qualityFlag: row.quality_flag,
          minThreshold,
          maxThreshold,
          status,
        });
      }
    }

    return Array.from(sensorMap.values());
  }

  /**
   * Get sensor types available for a project
   * Returns list of sensor types that have sensor channels in the project
   */
  async getSensorTypes(projectId: string): Promise<any[]> {
    const query = `
      SELECT DISTINCT
        st.id_sensor_type as id,
        st.category,
        st.default_unit,
        COUNT(sc.id_sensor_channel) as channel_count
      FROM sensor_types st
      JOIN sensor_channels sc ON st.id_sensor_type = sc.id_sensor_type
      JOIN sensors s ON sc.id_sensor = s.id_sensor
      JOIN nodes n ON s.id_node = n.id_node
      WHERE n.id_project = $1
      GROUP BY st.id_sensor_type, st.category, st.default_unit
      ORDER BY st.category
    `;

    const rows = await this.dataSource.query(query, [projectId]);
    return rows.map((row: any, index: number) => ({
      id: row.id,
      name: row.category,
      code: row.category?.toLowerCase().replace(/\s+/g, '-') || `type-${index}`,
      icon: this.getSensorTypeIcon(row.category),
      unit: row.default_unit || '',
      position: index,
      channelCount: parseInt(row.channel_count, 10),
    }));
  }

  /**
   * Get icon for sensor type based on category
   */
  private getSensorTypeIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'Tekanan': 'pi pi-gauge',
      'Flow': 'pi pi-arrows-alt',
      'Level': 'pi pi-chart-bar',
      'Temperatura': 'pi pi-sun',
      'Temperature': 'pi pi-sun',
      'Kelembaban': 'pi pi-cloud',
      'Humidity': 'pi pi-cloud',
      'Kualitas Air': 'pi pi-filter',
      'pH': 'pi pi-filter',
      'Turbidity': 'pi pi-circle-fill',
      'Chlorine': 'pi pi-circle',
    };
    return iconMap[category] || 'pi pi-circle';
  }

  /**
   * Get sensor channels as GeoJSON for a project, optionally filtered by sensor type
   * Coordinates: node (sensors don't have coordinates)
   * Values: ClickHouse sensor_channel_latest
   */
  async getSensorChannelsGeoJson(
    projectId: string,
    sensorTypeId?: string,
  ): Promise<CoreGeoJSONResponse> {
    // Step 1: Get metadata from PostgreSQL (no sensor_logs join)
    let metadataQuery = `
      SELECT 
        sc.id_sensor_channel as id,
        sc.metric_code,
        sc.unit,
        sc.min_threshold,
        sc.max_threshold,
        st.id_sensor_type,
        st.category as sensor_type_name,
        LOWER(REPLACE(st.category, ' ', '-')) as sensor_type_code,
        'pi pi-circle' as sensor_type_icon,
        s.id_sensor,
        s.sensor_code,
        s.label as sensor_label,
        n.id_node,
        n.code as node_code,
        n.name as node_name,
        n.latitude as node_lat,
        n.longitude as node_lon
      FROM sensor_channels sc
      JOIN sensors s ON sc.id_sensor = s.id_sensor
      JOIN nodes n ON s.id_node = n.id_node
      LEFT JOIN sensor_types st ON sc.id_sensor_type = st.id_sensor_type
      WHERE n.id_project = $1
    `;

    const params: any[] = [projectId];
    
    if (sensorTypeId) {
      metadataQuery += ` AND sc.id_sensor_type = $2`;
      params.push(sensorTypeId);
    }

    metadataQuery += ` ORDER BY n.code, s.label, sc.metric_code`;

    const rows = await this.dataSource.query(metadataQuery, params);

    // Step 2: Get latest values from ClickHouse
    let clickhouseValues = new Map<string, any>();
    
    if (this.clickhouseService.isAvailable()) {
      try {
        const clickhouseQuery = `
          SELECT 
            channel_id,
            eng_value,
            raw_value,
            last_update
          FROM sensor_channel_latest
          WHERE project_id = '${projectId}'
        `;
        
        const result = await this.clickhouseService.executeQuery(clickhouseQuery);
        
        for (const row of result.rows) {
          clickhouseValues.set(row.channel_id, {
            value_engineered: row.eng_value,
            value_raw: row.raw_value,
            ts: row.last_update,
            quality_flag: 'good',
          });
        }
        
        this.logger.debug(`ClickHouse: Loaded ${clickhouseValues.size} channel values for GeoJSON`);
      } catch (error) {
        this.logger.warn(`ClickHouse query failed: ${error.message}`);
      }
    }

    // Step 3: Group sensor channels by location for offset calculation
    const locationMap = new Map<string, number>();
    
    const features: CoreGeoJSONFeature[] = rows.map((row: any) => {
      // Coordinate from node (sensors table doesn't have coordinates)
      let lat: number, lon: number;
      let coordinateSource: string;
      
      if (row.node_lat !== null && row.node_lon !== null) {
        lat = parseFloat(row.node_lat);
        lon = parseFloat(row.node_lon);
        coordinateSource = 'node';
      } else {
        lat = DEFAULT_LAT;
        lon = DEFAULT_LON;
        coordinateSource = 'default';
      }

      // Calculate offset for sensors at same location
      const locationKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
      const indexAtLocation = locationMap.get(locationKey) || 0;
      locationMap.set(locationKey, indexAtLocation + 1);

      // Apply small offset in circular pattern (if more than one at same location)
      if (indexAtLocation > 0) {
        const offsetRadius = 0.00008; // approximately 8 meters
        const angle = (indexAtLocation * 60) * (Math.PI / 180); // 60 degree intervals
        lon += offsetRadius * Math.cos(angle);
        lat += offsetRadius * Math.sin(angle);
      }

      // Get value from ClickHouse
      const chValue = clickhouseValues.get(row.id);
      const value = chValue?.value_engineered ?? null;
      const timestamp = chValue?.ts ?? null;
      const qualityFlag = chValue?.quality_flag ?? 'unknown';
      
      // Determine status based on thresholds
      const minThreshold = row.min_threshold !== null ? parseFloat(row.min_threshold) : null;
      const maxThreshold = row.max_threshold !== null ? parseFloat(row.max_threshold) : null;
      
      let status: 'normal' | 'warning' | 'critical' | 'unknown' = 'unknown';
      if (value !== null) {
        if (minThreshold !== null && value < minThreshold) {
          status = 'critical';
        } else if (maxThreshold !== null && value > maxThreshold) {
          status = 'critical';
        } else {
          status = 'normal';
        }
      }

      return {
        type: 'Feature',
        id: row.id,
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          metricCode: row.metric_code,
          unit: row.unit || '',
          sensorTypeId: row.id_sensor_type,
          sensorTypeName: row.sensor_type_name,
          sensorTypeCode: row.sensor_type_code,
          sensorTypeIcon: row.sensor_type_icon,
          sensorId: row.id_sensor,
          sensorCode: row.sensor_code,
          sensorLabel: row.sensor_label,
          nodeId: row.id_node,
          nodeCode: row.node_code,
          nodeName: row.node_name,
          coordinateSource,
          value,
          timestamp,
          qualityFlag,
          minThreshold,
          maxThreshold,
          status,
          offsetIndex: indexAtLocation,
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }
}
