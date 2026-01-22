import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-manage-projects-tutorial',
  templateUrl: './manage-projects-tutorial.component.html',
  styleUrls: ['./manage-projects-tutorial.component.scss']
})
export class ManageProjectsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'owner-manage-projects',
    title: 'Manage Projects',
    category: 'Owner Guide',
    difficulty: 'beginner',
    estimatedTime: 12,
    description: 'Create and assign projects to teams',
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
