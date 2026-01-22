import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-user-management-tutorial',
  templateUrl: './user-management-tutorial.component.html',
  styleUrls: ['./user-management-tutorial.component.scss']
})
export class UserManagementTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'admin-user-management',
    title: 'User Management',
    category: 'Admin Guide',
    difficulty: 'beginner',
    estimatedTime: 12,
    description: 'Add, edit, and delete users',
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
