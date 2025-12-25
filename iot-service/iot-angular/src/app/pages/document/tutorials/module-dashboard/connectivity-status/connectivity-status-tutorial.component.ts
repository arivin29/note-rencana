import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-connectivity-status-tutorial',
  templateUrl: './connectivity-status-tutorial.component.html',
  styleUrls: ['./connectivity-status-tutorial.component.scss']
})
export class ConnectivityStatusTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-dashboard-connectivity',
    title: 'Connectivity Status',
    category: 'Module: Dashboard',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'View connectivity statistics',
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
