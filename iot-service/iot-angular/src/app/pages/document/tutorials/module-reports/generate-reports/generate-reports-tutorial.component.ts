import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-generate-reports-tutorial',
  templateUrl: './generate-reports-tutorial.component.html',
  styleUrls: ['./generate-reports-tutorial.component.scss']
})
export class GenerateReportsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-reports-generate',
    title: 'Generate Reports',
    category: 'Module: Reports',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Create custom reports',
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
