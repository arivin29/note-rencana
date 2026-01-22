import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-report-templates-tutorial',
  templateUrl: './report-templates-tutorial.component.html',
  styleUrls: ['./report-templates-tutorial.component.scss']
})
export class ReportTemplatesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-reports-templates',
    title: 'Report Templates',
    category: 'Module: Reports',
    difficulty: 'beginner',
    estimatedTime: 4,
    description: 'Use and create templates',
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
