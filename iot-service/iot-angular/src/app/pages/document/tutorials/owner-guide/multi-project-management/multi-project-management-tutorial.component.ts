import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-multi-project-management-tutorial',
  templateUrl: './multi-project-management-tutorial.component.html',
  styleUrls: ['./multi-project-management-tutorial.component.scss']
})
export class MultiProjectManagementTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'owner-multi-project',
    title: 'Multi-Project Management',
    category: 'Owner Guide',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'Manage multiple projects overview',
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
