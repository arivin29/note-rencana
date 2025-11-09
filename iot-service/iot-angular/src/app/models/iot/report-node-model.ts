export interface NodeModel {
  idNodeModel: string;
  vendor: string;
  modelName: string;
  protocol: string;
  communicationBand?: string;
  powerType?: string;
  hardwareRevision?: string;
  defaultFirmware?: string;
}

export interface ReportNodeModel extends NodeModel {}
