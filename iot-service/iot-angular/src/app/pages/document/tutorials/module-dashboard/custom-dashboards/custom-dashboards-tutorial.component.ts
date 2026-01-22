import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-custom-dashboards-tutorial',
  templateUrl: './custom-dashboards-tutorial.component.html',
  styleUrls: ['./custom-dashboards-tutorial.component.scss']
})
export class CustomDashboardsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-dashboard-custom',
    title: 'Custom Dashboards',
    category: 'Module: Dashboard',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'Create personalized dashboard views',
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
