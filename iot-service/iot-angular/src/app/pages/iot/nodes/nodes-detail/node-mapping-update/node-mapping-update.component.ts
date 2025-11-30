import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { NodesService, NodeProfilesService, IoTLogsService } from 'src/sdk/core/services';
import { NodeProfileResponseDto } from 'src/sdk/core/models';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

interface SensorChannel {
  idSensorChannel: string;
  metricCode: string;
  unit: string;
  latestValue?: number;
  timestamp?: string;
  status: string;
}

interface SensorWithData {
  idSensor: string;
  sensorCode: string;
  catalogName: string;
  status: string;
  channels: SensorChannel[];
}

interface MetadataTarget {
  key: string;
  label: string;
  icon: string;
  description: string;
  hints: string[];
}

interface MetadataMapping {
  path: string;
  type?: string;
}

@Component({
  selector: 'app-node-mapping-update',
  templateUrl: './node-mapping-update.component.html',
  styleUrls: ['./node-mapping-update.component.scss'],
  standalone: false
})
export class NodeMappingUpdateComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() nodeId!: string;
  @Input() idNodeProfile!: string;
  @Output() close = new EventEmitter<void>();

  loading = false;
  nodeDashboard: any = null;
  profileDetail: NodeProfileResponseDto | null = null;
  payloadFields: string[] = [];
  currentMapping: any = {};
  metadataMapping: Record<string, MetadataMapping> = {};
  recentLogs: any[] = []; // Store 10 recent logs
  selectedLogIndex: number = 0; // Currently selected log index

  readonly metaTargets: MetadataTarget[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      icon: 'fa fa-clock',
      description: 'Required for ordering telemetry & logs',
      hints: ['timestamp', 'ts', 'tm', 'time', 'created_at']
    },
    {
      key: 'deviceId',
      label: 'Device Identifier',
      icon: 'fa fa-fingerprint',
      description: 'Matches payload source to a node/hardware',
      hints: ['device_id', 'dev_eui', 'hwid', 'sensor_id']
    },
    {
      key: 'signalQuality',
      label: 'Signal Quality',
      icon: 'fa fa-signal',
      description: 'Optional RSSI/SNR for diagnostics',
      hints: ['rssi', 'snr', 'signal', 'quality']
    }
  ];

  constructor(
    private nodesService: NodesService,
    private nodeProfilesService: NodeProfilesService,
    private iotLogsService: IoTLogsService
  ) {}

  ngOnChanges(): void {
    console.log('NodeMappingUpdate ngOnChanges:', {
      isOpen: this.isOpen,
      nodeId: this.nodeId,
      idNodeProfile: this.idNodeProfile
    });
    
    if (this.isOpen && this.nodeId && this.idNodeProfile) {
      this.loadData();
    }
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadNodeDashboard(),
        this.loadProfileDetail()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadNodeDashboard(): Promise<void> {
    try {
      const response = await this.nodesService.nodesControllerGetDashboard({ 
        id: this.nodeId 
      }).toPromise();
      
      console.log('=== Raw API Response ===');
      console.log('Type:', typeof response);
      console.log('Response:', response);
      
      // Parse if it's a string, otherwise use as-is
      this.nodeDashboard = typeof response === 'string' ? JSON.parse(response) : response;
      
      console.log('=== Parsed nodeDashboard ===');
      console.log('Full nodeDashboard:', this.nodeDashboard);
      console.log('sensorsWithData:', this.nodeDashboard?.sensorsWithData);
      console.log('sensorsWithData length:', this.nodeDashboard?.sensorsWithData?.length);
      
      if (!this.nodeDashboard?.sensorsWithData || this.nodeDashboard.sensorsWithData.length === 0) {
        console.error('⚠️ WARNING: sensorsWithData is empty or undefined!');
        console.log('Available keys in nodeDashboard:', Object.keys(this.nodeDashboard || {}));
      }
      
      // Extract payload fields from recent IoT logs
      await this.extractPayloadFieldsFromLogs();
    } catch (error) {
      console.error('Error loading node dashboard:', error);
    }
  }

  async loadProfileDetail(): Promise<void> {
    try {
      this.profileDetail = await this.nodeProfilesService.nodeProfilesControllerFindOne({ 
        id: this.idNodeProfile 
      }).toPromise() || null;
      
      console.log('Profile Detail:', this.profileDetail);
      console.log('Profile mappingJson:', this.profileDetail?.mappingJson);
      
      if (this.profileDetail && this.profileDetail.mappingJson) {
        // Extract channel mapping from mappingJson
        const mappingJson = this.profileDetail.mappingJson as any;
        console.log('Parsed mappingJson:', mappingJson);
        
        this.currentMapping = {};
        
        // Check new structure: mappingJson.sensors[].channels[]
        if (mappingJson.sensors && Array.isArray(mappingJson.sensors)) {
          console.log('Found sensors array in mappingJson');
          mappingJson.sensors.forEach((sensor: any) => {
            if (sensor.channels && Array.isArray(sensor.channels)) {
              sensor.channels.forEach((ch: any) => {
                // Try different field names for channel code and path
                const channelCode = ch.channelCode || ch.metricCode;
                const sourcePath = ch.payloadPath || ch.path || ch.sourcePath;
                
                if (channelCode && sourcePath) {
                  this.currentMapping[channelCode] = sourcePath;
                }
              });
            }
          });
          console.log('Current Mapping loaded from sensors:', this.currentMapping);
        } 
        // Fallback: check old structure mappingJson.channels[]
        else if (mappingJson.channels && Array.isArray(mappingJson.channels)) {
          console.log('Found channels array in mappingJson (old structure)');
          mappingJson.channels.forEach((ch: any) => {
            const channelCode = ch.channelCode || ch.metricCode;
            const sourcePath = ch.payloadPath || ch.path || ch.sourcePath;
            
            if (channelCode && sourcePath) {
              this.currentMapping[channelCode] = sourcePath;
            }
          });
          console.log('Current Mapping loaded from channels:', this.currentMapping);
        } else {
          console.warn('No sensors or channels array found in mappingJson');
        }
        
        // Load metadata mappings
        if (mappingJson.metadata && typeof mappingJson.metadata === 'object') {
          console.log('Found metadata in mappingJson');
          this.metadataMapping = {};
          Object.keys(mappingJson.metadata).forEach(key => {
            const meta = mappingJson.metadata[key];
            if (meta && meta.path) {
              this.metadataMapping[key] = {
                path: meta.path,
                type: meta.type
              };
            }
          });
          console.log('Metadata mapping loaded:', this.metadataMapping);
        }
      } else {
        console.warn('No mappingJson found in profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async extractPayloadFieldsFromLogs(): Promise<void> {
    try {
        if (!this.nodeDashboard?.node?.code) {
            console.warn('No code found in node dashboard');
        return;
      }

        const deviceId = this.nodeDashboard.node.code;
      console.log('Fetching IoT logs for deviceId:', deviceId);

      // Fetch latest 10 IoT logs for this device (each may have different payload structure)
      const logsResponse: any = await this.iotLogsService.iotLogsControllerFindAll({
        deviceId: deviceId,
        page: 1,
        limit: 10 // Get latest 10 logs to allow user to select which payload structure to use
      }).toPromise();

      // Parse response if it's a string
      const logs = typeof logsResponse === 'string' ? JSON.parse(logsResponse) : logsResponse;

      if (logs && logs.data && Array.isArray(logs.data) && logs.data.length > 0) {
        // Store all logs for dropdown selection
        this.recentLogs = logs.data;
        
        // Extract fields from the first log by default
        this.updatePayloadFieldsFromLog(0);
      } else {
        console.warn('No IoT logs found for this device');
        this.recentLogs = [];
        this.payloadFields = [];
      }
    } catch (error) {
      console.error('Error fetching IoT logs:', error);
      this.recentLogs = [];
      this.payloadFields = [];
    }
  }

  /**
   * Update payload fields based on selected log index
   */
  updatePayloadFieldsFromLog(logIndex: number | string): void {
    // Convert to number if it's a string (from select dropdown)
    const index = typeof logIndex === 'string' ? parseInt(logIndex, 10) : logIndex;
    
    if (index < 0 || index >= this.recentLogs.length || isNaN(index)) {
      console.warn('Invalid log index:', logIndex);
      return;
    }

    this.selectedLogIndex = index;
    const selectedLog = this.recentLogs[index];
    
    if (selectedLog && selectedLog.payload) {
      // Parse payload if it's a string
      const payload = typeof selectedLog.payload === 'string' 
        ? JSON.parse(selectedLog.payload) 
        : selectedLog.payload;
      
      const fields = this.extractFieldPaths(payload);
      this.payloadFields = fields.sort();
      
      console.log('Updated payload fields from log #' + (index + 1), this.payloadFields);
    } else {
      console.warn('No payload found in selected log');
      this.payloadFields = [];
    }
  }

  /**
   * Get display info for log dropdown
   */
  getLogDisplayInfo(log: any, index: number): string {
    const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'No timestamp';
    const fieldCount = this.getFieldCountFromLog(log);
    return `Log #${index + 1} - ${timestamp} (${fieldCount} fields)`;
  }

  /**
   * Get field count from a log's payload
   */
  getFieldCountFromLog(log: any): number {
    if (!log.payload) return 0;
    try {
      const payload = typeof log.payload === 'string' 
        ? JSON.parse(log.payload) 
        : log.payload;
      return this.extractFieldPaths(payload).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Recursively extract field paths from a nested object
   * Example: { data: { temperature: 25 } } => ['data.temperature']
   */
  private extractFieldPaths(obj: any, prefix = ''): string[] {
    const fields: string[] = [];

    if (typeof obj !== 'object' || obj === null) {
      return fields;
    }

    Object.keys(obj).forEach(key => {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - recurse
        fields.push(...this.extractFieldPaths(value, path));
      } else {
        // Primitive value or array - add as field
        fields.push(path);
      }
    });

    return fields;
  }

  getSensorsWithChannels(): SensorWithData[] {
    const sensors = this.nodeDashboard?.sensorsWithData || [];
    console.log('getSensorsWithChannels called, returning:', sensors.length, 'sensors');
    if (sensors.length === 0) {
      console.warn('No sensors found in nodeDashboard.sensorsWithData');
      console.log('nodeDashboard object:', this.nodeDashboard);
    }
    return sensors;
  }

  get connectedDropLists(): string[] {
    const ids: string[] = ['payload-fields'];
    
    // Add all channel drop zones
    const sensors = this.getSensorsWithChannels();
    sensors.forEach(sensor => {
      if (sensor.channels && Array.isArray(sensor.channels)) {
        sensor.channels.forEach(channel => {
          ids.push(`drop-${channel.metricCode}`);
        });
      }
    });
    
    // Add metadata drop zones
    this.metaTargets.forEach(target => {
      ids.push(`meta-${target.key}`);
    });
    
    return ids;
  }

  getChannelMapping(metricCode: string): string | undefined {
    return this.currentMapping[metricCode];
  }

  getMappingJsonPreview(): any {
    // Return the full mappingJson structure for preview
    if (!this.profileDetail?.mappingJson) {
      return { 
        info: 'No mapping configured yet',
        currentMapping: this.currentMapping 
      };
    }
    
    return this.profileDetail.mappingJson;
  }

  onDrop(event: CdkDragDrop<any>, metricCode: string): void {
    console.log('Drop event triggered!', event);
    console.log('Target metricCode:', metricCode);
    console.log('Event item data:', event.item.data);
    
    // Get the dragged field from event data
    const fieldPath = event.item.data as string;
    
    if (!fieldPath) {
      console.warn('No field path in drag data');
      return;
    }
    
    this.currentMapping[metricCode] = fieldPath;
    console.log('Mapped', metricCode, '->', fieldPath);
    console.log('Current mapping state:', this.currentMapping);
  }

  removeMapping(metricCode: string): void {
    delete this.currentMapping[metricCode];
    console.log('Removed mapping for', metricCode);
  }

  // Metadata Mapping Methods
  getMetaDropId(key: string): string {
    return `meta-${key}`;
  }

  getMetaMapping(key: string): MetadataMapping | undefined {
    return this.metadataMapping[key];
  }

  onMetaDrop(event: CdkDragDrop<any>, key: string): void {
    console.log('Meta drop event triggered!', event);
    console.log('Target meta key:', key);
    console.log('Event item data:', event.item.data);
    
    const fieldPath = event.item.data as string;
    
    if (!fieldPath) {
      console.warn('No field path in drag data');
      return;
    }
    
    this.metadataMapping[key] = {
      path: fieldPath,
      type: this.inferTypeFromPath(fieldPath)
    };
    
    console.log('Mapped metadata', key, '->', fieldPath);
    console.log('Current metadata mapping:', this.metadataMapping);
  }

  onMetaMappingRemoved(key: string): void {
    delete this.metadataMapping[key];
    console.log('Removed metadata mapping for', key);
  }

  private inferTypeFromPath(path: string): string {
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes('time') || lowerPath.includes('date') || lowerPath.includes('timestamp')) {
      return 'timestamp';
    }
    if (lowerPath.includes('id') || lowerPath.includes('device') || lowerPath.includes('identifier')) {
      return 'string';
    }
    if (lowerPath.includes('rssi') || lowerPath.includes('snr') || lowerPath.includes('signal') || lowerPath.includes('quality')) {
      return 'number';
    }
    return 'string';
  }

  async saveMapping(): Promise<void> {
    if (!confirm('Are you sure you want to update the channel mapping?')) {
      return;
    }

    this.loading = true;
    try {
      // Get existing mappingJson from profile
      const existingMappingJson = (this.profileDetail?.mappingJson as any) || {};
      console.log('Existing mappingJson:', existingMappingJson);
      
      // Preserve existing structure
      const updatedMappingJson = {
        ...existingMappingJson,
        sensors: existingMappingJson.sensors || [],
        metadata: {} // Will be populated below
      };

      // Update payloadPath in channels based on currentMapping
      const sensorsWithData = this.getSensorsWithChannels();
      
      updatedMappingJson.sensors = sensorsWithData.map((sensor: any) => {
        // Find existing sensor config or create new
        const existingSensor = updatedMappingJson.sensors.find(
          (s: any) => s.idSensor === sensor.idSensor
        ) || {};

        return {
          label: existingSensor.label || sensor.sensorCode,
          idSensor: sensor.idSensor,
          catalogId: existingSensor.catalogId || `catalog-${sensor.idSensor}`,
          idSensorCatalog: existingSensor.idSensorCatalog || `catalog-${sensor.idSensor}`,
          channels: (sensor.channels || []).map((channel: any) => {
            // Find existing channel config
            const existingChannel = existingSensor.channels?.find(
              (c: any) => c.channelCode === channel.metricCode || c.idSensorChannel === channel.idSensorChannel
            ) || {};

            // Get payloadPath from currentMapping
            const payloadPath = this.currentMapping[channel.metricCode] || existingChannel.payloadPath;

            return {
              unit: channel.unit || existingChannel.unit,
              channelCode: channel.metricCode || existingChannel.channelCode,
              payloadPath: payloadPath, // This is the updated mapping!
              idSensorChannel: channel.idSensorChannel,
              idChannelTemplate: existingChannel.idChannelTemplate || channel.idSensorChannel
            };
          })
        };
      });
      
      // Add metadata mappings
      updatedMappingJson.metadata = {};
      Object.keys(this.metadataMapping).forEach(key => {
        updatedMappingJson.metadata[key] = {
          path: this.metadataMapping[key].path,
          type: this.metadataMapping[key].type || 'string'
        };
      });

      console.log('Updated mappingJson:', updatedMappingJson);

      // Send update to backend
      await this.nodeProfilesService.nodeProfilesControllerUpdate({
        id: this.idNodeProfile,
        body: {
          mappingJson: updatedMappingJson
        }
      }).toPromise();
      
      alert('Mapping updated successfully!');
      
      // Reload profile to get fresh data
      await this.loadProfileDetail();
      
    } catch (error) {
      console.error('Error saving mapping:', error);
      alert('Failed to save mapping. Check console for details.');
    } finally {
      this.loading = false;
    }
  }

  closeDrawer(): void {
    this.close.emit();
  }
}
