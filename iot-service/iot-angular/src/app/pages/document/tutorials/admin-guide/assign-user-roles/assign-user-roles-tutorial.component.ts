import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-assign-user-roles-tutorial',
  templateUrl: './assign-user-roles-tutorial.component.html',
  styleUrls: ['./assign-user-roles-tutorial.component.scss']
})
export class AssignUserRolesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'admin-assign-roles',
    title: 'Assign User Roles',
    category: 'Admin Guide',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Role-based access control',
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
