import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-alert-notifications-tutorial',
  templateUrl: './alert-notifications-tutorial.component.html',
  styleUrls: ['./alert-notifications-tutorial.component.scss']
})
export class AlertNotificationsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-alerts-notifications',
    title: 'Alert Notifications',
    category: 'Module: Alerts',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Email and SMS notifications setup',
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
