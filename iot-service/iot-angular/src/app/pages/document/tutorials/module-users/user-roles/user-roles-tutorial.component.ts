import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-user-roles-tutorial',
  templateUrl: './user-roles-tutorial.component.html',
  styleUrls: ['./user-roles-tutorial.component.scss']
})
export class UserRolesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-users-roles',
    title: 'User Roles',
    category: 'Module: Users',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Assign roles and permissions',
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
