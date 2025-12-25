import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-edit-owner-tutorial',
  templateUrl: './edit-owner-tutorial.component.html',
  styleUrls: ['./edit-owner-tutorial.component.scss']
})
export class EditOwnerTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-owners-edit',
    title: 'Edit Owner',
    category: 'Module: Owners',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Modify owner information and settings',
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
