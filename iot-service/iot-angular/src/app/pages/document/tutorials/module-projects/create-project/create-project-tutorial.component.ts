import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-create-project-tutorial',
  templateUrl: './create-project-tutorial.component.html',
  styleUrls: ['./create-project-tutorial.component.scss']
})
export class CreateProjectTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-projects-create',
    title: 'Create New Project',
    category: 'Module: Projects',
    difficulty: 'beginner',
    estimatedTime: 12,
    description: 'Add project and configure settings',
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
