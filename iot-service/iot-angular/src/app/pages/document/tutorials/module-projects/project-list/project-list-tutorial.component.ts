import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-project-list-tutorial',
  templateUrl: './project-list-tutorial.component.html',
  styleUrls: ['./project-list-tutorial.component.scss']
})
export class ProjectListTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-projects-list',
    title: 'Project List & Overview',
    category: 'Module: Projects',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'View all projects with filters',
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
