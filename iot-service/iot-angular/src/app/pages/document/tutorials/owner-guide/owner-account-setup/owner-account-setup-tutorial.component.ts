import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-owner-account-setup-tutorial',
  templateUrl: './owner-account-setup-tutorial.component.html',
  styleUrls: ['./owner-account-setup-tutorial.component.scss']
})
export class OwnerAccountSetupTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'owner-account-setup',
    title: 'Owner Account Setup',
    category: 'Owner Guide',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Create owner account and company info',
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
