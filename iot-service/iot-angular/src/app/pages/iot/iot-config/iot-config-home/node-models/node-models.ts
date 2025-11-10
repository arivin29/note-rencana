import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NodeModel } from '../../../../../models/iot/report-node-model';

@Component({
  selector: 'app-node-models',
  templateUrl: './node-models.html',
  styleUrls: ['./node-models.scss'],
  standalone: false
})
export class NodeModelsPage {
  nodeModelSearch = '';
  isDrawerOpen = false;

  hardwareClassOptions: Array<{ label: string; value: NonNullable<NodeModel['hardwareClass']> }> = [
    { label: 'MCU / DevKit', value: 'mcu' },
    { label: 'Gateway', value: 'gateway' },
    { label: 'Tracker', value: 'tracker' },
    { label: 'Custom', value: 'custom' }
  ];

  nodeModels: NodeModel[] = [
    {
      idNodeModel: 'mdl-esp32-lora',
      modelCode: 'ESP32-LORA',
      vendor: 'Espressif',
      modelName: 'ESP32 DevKit + LoRaWAN',
      protocol: 'LoRaWAN',
      communicationBand: '915MHz',
      powerType: 'DC',
      hardwareClass: 'mcu',
      toolchain: 'PlatformIO',
      buildAgent: 'agent-esp32',
      firmwareRepo: 'git@gitlab:devetek/iot-esp32.git',
      flashProtocol: 'OTA / USB',
      supportsCodegen: true,
      defaultFirmware: 'v2.3.0'
    },
    {
      idNodeModel: 'mdl-stm32-pipeline',
      modelCode: 'STM32-MODBUS',
      vendor: 'STMicro',
      modelName: 'STM32F7 Industrial',
      protocol: 'Modbus TCP',
      communicationBand: 'Ethernet',
      powerType: 'AC',
      hardwareClass: 'mcu',
      toolchain: 'PlatformIO',
      buildAgent: 'agent-stm32',
      firmwareRepo: 'git@gitlab:devetek/iot-stm32.git',
      flashProtocol: 'JTAG / DFU',
      supportsCodegen: true,
      defaultFirmware: 'v1.5.1'
    },
    {
      idNodeModel: 'mdl-arduino-mega',
      modelCode: 'ARD-MEGA',
      vendor: 'Arduino',
      modelName: 'Arduino Mega 2560',
      protocol: 'RS485',
      communicationBand: 'Wired',
      powerType: 'DC',
      hardwareClass: 'mcu',
      toolchain: 'Arduino IDE',
      buildAgent: 'agent-arduino',
      firmwareRepo: 'git@gitlab:devetek/iot-arduino-sketch.git',
      flashProtocol: 'USB',
      supportsCodegen: false,
      defaultFirmware: 'v0.9-beta'
    },
    {
      idNodeModel: 'mdl-fmb130',
      modelCode: 'TEL-FMB130',
      vendor: 'Teltonika',
      modelName: 'FMB130 Tracker',
      protocol: 'MQTT/HTTP',
      communicationBand: '4G/LTE',
      powerType: 'DC',
      hardwareClass: 'tracker',
      toolchain: 'Teltonika Configurator',
      buildAgent: 'agent-teltonika',
      firmwareRepo: 'binary-drop',
      flashProtocol: 'Proprietary / USB',
      supportsCodegen: false,
      defaultFirmware: 'v03.28'
    }
  ];

  constructor(private router: Router, private route: ActivatedRoute) {}

  get stats() {
    return {
      total: this.nodeModels.length,
      codegenSupported: this.nodeModels.filter((m) => m.supportsCodegen).length
    };
  }

  get filteredNodeModels() {
    const term = this.nodeModelSearch.trim().toLowerCase();
    if (!term) {
      return this.nodeModels;
    }
    return this.nodeModels.filter((model) =>
      model.modelCode?.toLowerCase().includes(term) ||
      model.vendor.toLowerCase().includes(term) ||
      model.modelName.toLowerCase().includes(term) ||
      (model.toolchain ?? '').toLowerCase().includes(term)
    );
  }

  openDrawer() {
    this.isDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
  }

  handleDrawerSave(model: NodeModel) {
    const payload: NodeModel = {
      ...model,
      idNodeModel: model.idNodeModel && model.idNodeModel.length ? model.idNodeModel : `mdl-${Date.now()}`
    };
    this.nodeModels = [payload, ...this.nodeModels];
    this.closeDrawer();
  }

  navigateToModel(model: NodeModel) {
    if (!model.modelCode) {
      return;
    }
    this.router.navigate([model.modelCode], { relativeTo: this.route });
  }
}
