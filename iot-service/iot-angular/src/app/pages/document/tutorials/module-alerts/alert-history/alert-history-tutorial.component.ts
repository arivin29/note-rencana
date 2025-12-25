import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-alert-history-tutorial',
  templateUrl: './alert-history-tutorial.component.html',
  styleUrls: ['./alert-history-tutorial.component.scss']
})
export class AlertHistoryTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-alerts-history',
    title: 'Alert History',
    category: 'Module: Alerts',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'View historical alerts',
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
