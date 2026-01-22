import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-node-registration-tutorial',
  templateUrl: './node-registration-tutorial.component.html',
  styleUrls: ['./node-registration-tutorial.component.scss']
})
export class NodeRegistrationTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'admin-node-registration',
    title: 'Node Registration',
    category: 'Admin Guide',
    difficulty: 'beginner',
    estimatedTime: 15,
    description: 'Register new nodes and pairing process',
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
