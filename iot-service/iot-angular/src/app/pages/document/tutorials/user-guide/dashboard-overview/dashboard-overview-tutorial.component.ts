import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-dashboard-overview-tutorial',
  templateUrl: './dashboard-overview-tutorial.component.html',
  styleUrls: ['./dashboard-overview-tutorial.component.scss']
})
export class DashboardOverviewTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'user-dashboard-overview',
    title: 'Dashboard Overview',
    category: 'User Guide',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Understanding widgets, KPIs, and navigation',
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
