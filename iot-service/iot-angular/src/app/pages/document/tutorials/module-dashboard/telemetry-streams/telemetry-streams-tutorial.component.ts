import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-telemetry-streams-tutorial',
  templateUrl: './telemetry-streams-tutorial.component.html',
  styleUrls: ['./telemetry-streams-tutorial.component.scss']
})
export class TelemetryStreamsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-dashboard-telemetry',
    title: 'Telemetry Streams',
    category: 'Module: Dashboard',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'Real-time data streams visualization',
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
