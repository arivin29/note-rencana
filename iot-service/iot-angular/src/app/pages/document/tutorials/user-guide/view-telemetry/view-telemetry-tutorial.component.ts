import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-view-telemetry-tutorial',
  templateUrl: './view-telemetry-tutorial.component.html',
  styleUrls: ['./view-telemetry-tutorial.component.scss']
})
export class ViewTelemetryTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'user-view-telemetry',
    title: 'View Telemetry Data',
    category: 'User Guide',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Real-time telemetry data and logs',
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
