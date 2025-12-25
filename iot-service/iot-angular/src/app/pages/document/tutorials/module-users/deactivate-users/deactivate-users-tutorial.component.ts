import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-deactivate-users-tutorial',
  templateUrl: './deactivate-users-tutorial.component.html',
  styleUrls: ['./deactivate-users-tutorial.component.scss']
})
export class DeactivateUsersTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-users-deactivate',
    title: 'Deactivate Users',
    category: 'Module: Users',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'Suspend or remove users',
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
