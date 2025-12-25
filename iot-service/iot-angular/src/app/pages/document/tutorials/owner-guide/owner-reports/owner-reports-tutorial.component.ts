import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-owner-reports-tutorial',
  templateUrl: './owner-reports-tutorial.component.html',
  styleUrls: ['./owner-reports-tutorial.component.scss']
})
export class OwnerReportsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'owner-reports',
    title: 'Owner Reports',
    category: 'Owner Guide',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Generate reports and export data',
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
