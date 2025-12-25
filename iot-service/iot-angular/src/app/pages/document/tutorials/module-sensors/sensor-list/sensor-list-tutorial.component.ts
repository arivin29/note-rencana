import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-list-tutorial',
  templateUrl: './sensor-list-tutorial.component.html',
  styleUrls: ['./sensor-list-tutorial.component.scss']
})
export class SensorListTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-sensors-list',
    title: 'Sensor List',
    category: 'Module: Sensors',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'View all sensors and status',
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
