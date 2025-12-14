import { Component } from '@angular/core';

// This page now uses the new AlertCenterComponent with real backend integration
@Component({
  selector: 'iot-alerts',
  template: '<alert-center></alert-center>',
  standalone: false
})
export class IotAlertsPage {
}
