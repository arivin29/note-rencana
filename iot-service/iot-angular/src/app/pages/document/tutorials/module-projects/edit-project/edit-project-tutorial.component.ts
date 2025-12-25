import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-edit-project-tutorial',
  templateUrl: './edit-project-tutorial.component.html',
  styleUrls: ['./edit-project-tutorial.component.scss']
})
export class EditProjectTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-projects-edit',
    title: 'Edit Project',
    category: 'Module: Projects',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Modify project settings and status',
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
