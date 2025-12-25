import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-add-new-user-tutorial',
  templateUrl: './add-new-user-tutorial.component.html',
  styleUrls: ['./add-new-user-tutorial.component.scss']
})
export class AddNewUserTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-users-add',
    title: 'Add New User',
    category: 'Module: Users',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Create user accounts',
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
