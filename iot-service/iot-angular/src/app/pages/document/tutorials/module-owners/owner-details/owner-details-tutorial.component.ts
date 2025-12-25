import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-owner-details-tutorial',
  templateUrl: './owner-details-tutorial.component.html',
  styleUrls: ['./owner-details-tutorial.component.scss']
})
export class OwnerDetailsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-owners-details',
    title: 'Owner Details',
    category: 'Module: Owners',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'View owner information and projects',
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
