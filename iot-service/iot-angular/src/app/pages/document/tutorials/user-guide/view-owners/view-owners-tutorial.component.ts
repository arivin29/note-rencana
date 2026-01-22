import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-view-owners-tutorial',
  templateUrl: './view-owners-tutorial.component.html',
  styleUrls: ['./view-owners-tutorial.component.scss']
})
export class ViewOwnersTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'user-view-owners',
    title: 'View Owners',
    category: 'User Guide',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'View owner information and contact details',
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
