import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-calibration-tutorial',
  templateUrl: './sensor-calibration-tutorial.component.html',
  styleUrls: ['./sensor-calibration-tutorial.component.scss']
})
export class SensorCalibrationTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-sensors-calibration',
    title: 'Sensor Calibration',
    category: 'Module: Sensors',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'Calibrate sensors',
    sections: [
      { id: 'introduction', title: 'Introduction', duration: 2 },
      { id: 'getting-started', title: 'Getting Started', duration: 3 },
      { id: 'features', title: 'Key Features', duration: 3 },
      { id: 'next-steps', title: 'Next Steps', duration: 2 }
    ]
  };

  constructor() {
    super();
  }
}
