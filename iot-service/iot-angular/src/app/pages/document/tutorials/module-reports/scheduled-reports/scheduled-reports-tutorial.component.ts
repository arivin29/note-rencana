import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-scheduled-reports-tutorial',
  templateUrl: './scheduled-reports-tutorial.component.html',
  styleUrls: ['./scheduled-reports-tutorial.component.scss']
})
export class ScheduledReportsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-reports-scheduled',
    title: 'Scheduled Reports',
    category: 'Module: Reports',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Setup automated reports',
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
