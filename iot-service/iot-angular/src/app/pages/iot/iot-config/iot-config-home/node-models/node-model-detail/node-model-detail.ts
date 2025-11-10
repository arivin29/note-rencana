import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NodeModel } from '../../../../../../models/iot/report-node-model';

@Component({
  selector: 'app-node-model-detail',
  templateUrl: './node-model-detail.html',
  styleUrls: ['./node-model-detail.scss'],
  standalone: false
})
export class NodeModelDetailPage implements OnInit {
  model?: NodeModel;
  payloadExample: any;

  private mockModels: NodeModel[] = [
    {
      idNodeModel: 'mdl-esp32-lora',
      modelCode: 'ESP32-LORA',
      vendor: 'Espressif',
      modelName: 'ESP32 DevKit + LoRaWAN',
      protocol: 'LoRaWAN',
      communicationBand: '915MHz',
      powerType: 'DC',
      hardwareClass: 'mcu',
      hardwareRevision: 'revB',
      toolchain: 'PlatformIO',
      buildAgent: 'agent-esp32',
      firmwareRepo: 'git@gitlab:devetek/iot-esp32.git',
      flashProtocol: 'OTA / USB',
      supportsCodegen: true,
      defaultFirmware: 'v2.3.0'
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
      hardwareRevision: '2024.1',
      toolchain: 'Teltonika Configurator',
      buildAgent: 'agent-teltonika',
      firmwareRepo: 'binary-drop',
      flashProtocol: 'Proprietary / USB',
      supportsCodegen: false,
      defaultFirmware: 'v03.28'
    }
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const modelCode = this.route.snapshot.paramMap.get('modelCode');
    this.model = this.mockModels.find((m) => m.modelCode === modelCode);

    if (!this.model) {
      this.router.navigate(['/iot/config/node-models']);
      return;
    }

    this.payloadExample = this.buildPayloadExample(this.model);
  }

  private buildPayloadExample(model: NodeModel) {
    const base = {
      modelCode: model.modelCode,
      firmwareVersion: model.defaultFirmware || 'v1.0.0',
      deviceSerial: 'SN-XYZ-001',
      timestamp: new Date().toISOString(),
      telemetry: {
        pressure_bar: 2.48,
        flow_m3h: 118.2,
        battery_pct: 82
      },
      signature: 'HMAC-SHA256(payload, secret)' // ilustrasi
    };

    if (model.hardwareClass === 'tracker') {
      return {
        ...base,
        telemetry: {
          lat: -6.2205,
          lng: 106.8472,
          speed_kmh: 42,
          io: {
            ignition: true,
            digital1: false
          }
        }
      };
    }

    return base;
  }
}
