import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-view-alerts-tutorial',
  templateUrl: './view-alerts-tutorial.component.html',
  styleUrls: ['./view-alerts-tutorial.component.scss']
})
export class ViewAlertsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'user-view-alerts',
    title: 'View Alerts',
    category: 'User Guide',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'Active alerts and notifications',
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
