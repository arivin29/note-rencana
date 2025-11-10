import { Component } from '@angular/core';

interface SensorCatalog {
  model: string;
  vendor: string;
  protocol: string;
  icon: string;
  defaultChannels: number;
  firmware: string;
  calibrationDays: number;
}

@Component({
  selector: 'app-sensor-catalogs',
  templateUrl: './sensor-catalogs.html',
  styleUrls: ['./sensor-catalogs.scss'],
  standalone: false
})
export class SensorCatalogsPage {
  search = '';

  sensorCatalogs: SensorCatalog[] = [
    {
      model: 'PX-420i',
      vendor: 'Endress+Hauser',
      protocol: 'Modbus RTU',
      icon: 'bi bi-gauge',
      defaultChannels: 2,
      firmware: 'v2.1.0',
      calibrationDays: 365
    },
    {
      model: 'FLX-200',
      vendor: 'Siemens',
      protocol: 'Modbus TCP',
      icon: 'bi bi-tornado',
      defaultChannels: 3,
      firmware: 'v1.8.4',
      calibrationDays: 180
    },
    {
      model: 'HYDRO-LEVEL',
      vendor: 'ABB',
      protocol: 'Analog 4-20mA',
      icon: 'bi bi-water',
      defaultChannels: 1,
      firmware: 'v3.2.1',
      calibrationDays: 540
    },
    {
      model: 'AQUA-PH7',
      vendor: 'Yokogawa',
      protocol: 'RS485',
      icon: 'bi bi-droplet-half',
      defaultChannels: 2,
      firmware: 'v1.4.2',
      calibrationDays: 90
    }
  ];

  get filteredCatalogs() {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.sensorCatalogs;
    }
    return this.sensorCatalogs.filter((catalog) =>
      catalog.model.toLowerCase().includes(term) ||
      catalog.vendor.toLowerCase().includes(term) ||
      catalog.protocol.toLowerCase().includes(term)
    );
  }
}
