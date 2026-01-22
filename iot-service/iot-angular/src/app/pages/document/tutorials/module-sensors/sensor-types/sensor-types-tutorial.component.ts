import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-types-tutorial',
  templateUrl: './sensor-types-tutorial.component.html',
  styleUrls: ['./sensor-types-tutorial.component.scss']
})
export class SensorTypesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-sensors-types',
    title: 'Sensor Types',
    category: 'Module: Sensors',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Manage sensor types and categories',
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
