import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-channels-tutorial',
  templateUrl: './sensor-channels-tutorial.component.html',
  styleUrls: ['./sensor-channels-tutorial.component.scss']
})
export class SensorChannelsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-sensors-channels',
    title: 'Sensor Channels',
    category: 'Module: Sensors',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Configure sensor channels',
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
