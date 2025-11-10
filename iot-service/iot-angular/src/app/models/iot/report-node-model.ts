export interface NodeModel {
  idNodeModel: string;
  modelCode?: string;
  vendor: string;
  modelName: string;
  protocol: string;
  communicationBand?: string;
  powerType?: string;
  hardwareClass?: 'mcu' | 'gateway' | 'tracker' | 'custom';
  hardwareRevision?: string;
  toolchain?: string;
  buildAgent?: string;
  firmwareRepo?: string;
  flashProtocol?: string;
  supportsCodegen?: boolean;
  defaultFirmware?: string;
}

export interface ReportNodeModel extends NodeModel {}
