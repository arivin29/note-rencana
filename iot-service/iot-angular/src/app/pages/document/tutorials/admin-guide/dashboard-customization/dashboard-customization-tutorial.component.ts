import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-dashboard-customization-tutorial',
  templateUrl: './dashboard-customization-tutorial.component.html',
  styleUrls: ['./dashboard-customization-tutorial.component.scss']
})
export class DashboardCustomizationTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'admin-dashboard-custom',
    title: 'Dashboard Customization',
    category: 'Admin Guide',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Create custom dashboards and widgets',
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
