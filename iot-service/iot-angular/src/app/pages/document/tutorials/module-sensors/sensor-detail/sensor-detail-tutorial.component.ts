import { Component } from '@angular/core';

@Component({
  selector: 'app-sensor-detail-tutorial',
  templateUrl: './sensor-detail-tutorial.component.html',
  standalone: false
})
export class SensorDetailTutorialComponent {
  sections = [
    { id: 'introduction', title: 'Apa itu Sensor Detail View?' },
    { id: 'access', title: 'Cara Akses' },
    { id: 'interface', title: 'Interface & Features' },
    { id: 'usage', title: 'Cara Menggunakan' },
    { id: 'understanding-data', title: 'Memahami Telemetry Data' },
    { id: 'scenarios', title: 'Contoh Penggunaan' },
    { id: 'tips', title: 'Tips & Best Practices' },
    { id: 'related', title: 'Tutorial Terkait' },
    { id: 'quick-reference', title: 'Quick Reference' }
  ];

  currentSection = 0;

  getProgressPercentage(): number {
    return Math.round(((this.currentSection + 1) / this.sections.length) * 100);
  }

  nextSection() {
    if (this.currentSection < this.sections.length - 1) {
      this.currentSection++;
    }
  }

  previousSection() {
    if (this.currentSection > 0) {
      this.currentSection--;
    }
  }

  goToSection(index: number) {
    this.currentSection = index;
  }
}
