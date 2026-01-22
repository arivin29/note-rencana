import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-view-projects-tutorial',
  templateUrl: './view-projects-tutorial.component.html',
  styleUrls: ['./view-projects-tutorial.component.scss']
})
export class ViewProjectsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'user-view-projects',
    title: 'View Projects',
    category: 'User Guide',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Browse projects and project details',
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
