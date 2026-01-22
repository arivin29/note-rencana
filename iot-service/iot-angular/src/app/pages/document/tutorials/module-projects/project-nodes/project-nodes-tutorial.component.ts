import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-project-nodes-tutorial',
  templateUrl: './project-nodes-tutorial.component.html',
  styleUrls: ['./project-nodes-tutorial.component.scss']
})
export class ProjectNodesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-projects-nodes',
    title: 'Project Nodes',
    category: 'Module: Projects',
    difficulty: 'beginner',
    estimatedTime: 7,
    description: "View and manage project's nodes",
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
