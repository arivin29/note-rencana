import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-profile-builder-tutorial',
  templateUrl: './profile-builder-tutorial.component.html',
  styleUrls: ['./profile-builder-tutorial.component.scss']
})
export class ProfileBuilderTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-profiles-builder',
    title: 'Profile Builder',
    category: 'Module: Profiles',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'Use profile builder tool',
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
