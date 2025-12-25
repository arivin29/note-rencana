import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-not-reading-tutorial',
  templateUrl: './sensor-not-reading-tutorial.component.html',
  styleUrls: ['./sensor-not-reading-tutorial.component.scss']
})
export class SensorNotReadingTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'troubleshooting-sensor',
    title: 'Sensor Not Reading',
    category: 'Troubleshooting',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Fix sensor data issues',
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
