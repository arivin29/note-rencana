import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-alert-events-tutorial',
  templateUrl: './alert-events-tutorial.component.html',
  styleUrls: ['./alert-events-tutorial.component.scss']
})
export class AlertEventsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-alerts-events',
    title: 'Alert Events',
    category: 'Module: Alerts',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'View triggered alerts',
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
