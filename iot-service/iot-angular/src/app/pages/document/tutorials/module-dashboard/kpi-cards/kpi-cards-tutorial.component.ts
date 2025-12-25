import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-kpi-cards-tutorial',
  templateUrl: './kpi-cards-tutorial.component.html',
  styleUrls: ['./kpi-cards-tutorial.component.scss']
})
export class KpiCardsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-dashboard-kpi',
    title: 'KPI Cards',
    category: 'Module: Dashboard',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'Understanding KPI metrics and indicators',
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
