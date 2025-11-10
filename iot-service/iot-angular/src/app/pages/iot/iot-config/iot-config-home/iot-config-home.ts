import { Component } from '@angular/core';

@Component({
  selector: 'app-iot-config-home',
  templateUrl: './iot-config-home.html',
  styleUrls: ['./iot-config-home.scss'],
  standalone: false
})
export class IotConfigHomePage {
  tabs = [
    { path: 'node-models', label: 'Node Models', icon: 'bi bi-cpu' },
    { path: 'sensor-types', label: 'Sensor Types', icon: 'bi bi-grid' },
    { path: 'sensor-catalogs', label: 'Sensor Catalogs', icon: 'bi bi-box' } 
  ];
}
