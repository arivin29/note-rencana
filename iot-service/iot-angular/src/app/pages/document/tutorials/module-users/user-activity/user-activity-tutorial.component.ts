import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-user-activity-tutorial',
  templateUrl: './user-activity-tutorial.component.html',
  styleUrls: ['./user-activity-tutorial.component.scss']
})
export class UserActivityTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-users-activity',
    title: 'User Activity',
    category: 'Module: Users',
    difficulty: 'beginner',
    estimatedTime: 4,
    description: 'Monitor user actions',
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
