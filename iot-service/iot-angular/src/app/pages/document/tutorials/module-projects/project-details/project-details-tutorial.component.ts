import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-project-details-tutorial',
  templateUrl: './project-details-tutorial.component.html',
  styleUrls: ['./project-details-tutorial.component.scss']
})
export class ProjectDetailsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-projects-details',
    title: 'Project Details',
    category: 'Module: Projects',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'View project info, area type, geofence',
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
