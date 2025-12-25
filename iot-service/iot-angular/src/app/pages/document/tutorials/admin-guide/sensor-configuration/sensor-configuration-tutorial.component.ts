import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-configuration-tutorial',
  templateUrl: './sensor-configuration-tutorial.component.html',
  styleUrls: ['./sensor-configuration-tutorial.component.scss']
})
export class SensorConfigurationTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'admin-sensor-config',
    title: 'Sensor Configuration',
    category: 'Admin Guide',
    difficulty: 'beginner',
    estimatedTime: 15,
    description: 'Configure sensors, channels, and thresholds',
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
