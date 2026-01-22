import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-create-owner-tutorial',
  templateUrl: './create-owner-tutorial.component.html',
  styleUrls: ['./create-owner-tutorial.component.scss']
})
export class CreateOwnerTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-owners-create',
    title: 'Create New Owner',
    category: 'Module: Owners',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Add new owner account',
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
