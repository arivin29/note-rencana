import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-user-permissions-tutorial',
  templateUrl: './user-permissions-tutorial.component.html',
  styleUrls: ['./user-permissions-tutorial.component.scss']
})
export class UserPermissionsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-users-permissions',
    title: 'User Permissions',
    category: 'Module: Users',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Manage access control',
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
