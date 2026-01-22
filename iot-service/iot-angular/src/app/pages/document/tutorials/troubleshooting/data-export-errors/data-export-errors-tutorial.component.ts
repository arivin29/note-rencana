import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-data-export-errors-tutorial',
  templateUrl: './data-export-errors-tutorial.component.html',
  styleUrls: ['./data-export-errors-tutorial.component.scss']
})
export class DataExportErrorsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'troubleshooting-export',
    title: 'Data Export Errors',
    category: 'Troubleshooting',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'Fix export problems',
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
