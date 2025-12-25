import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-export-data-tutorial',
  templateUrl: './export-data-tutorial.component.html',
  styleUrls: ['./export-data-tutorial.component.scss']
})
export class ExportDataTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-reports-export',
    title: 'Export Data',
    category: 'Module: Reports',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Export to CSV, Excel, PDF',
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
