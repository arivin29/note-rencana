import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-owner-projects-tutorial',
  templateUrl: './owner-projects-tutorial.component.html',
  styleUrls: ['./owner-projects-tutorial.component.scss']
})
export class OwnerProjectsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-owners-projects',
    title: 'Owner Projects',
    category: 'Module: Owners',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: "Manage owner's project portfolio",
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
