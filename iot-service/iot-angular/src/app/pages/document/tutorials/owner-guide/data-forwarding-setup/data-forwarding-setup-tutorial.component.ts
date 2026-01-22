import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-data-forwarding-setup-tutorial',
  templateUrl: './data-forwarding-setup-tutorial.component.html',
  styleUrls: ['./data-forwarding-setup-tutorial.component.scss']
})
export class DataForwardingSetupTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'owner-data-forwarding',
    title: 'Data Forwarding Setup',
    category: 'Owner Guide',
    difficulty: 'beginner',
    estimatedTime: 15,
    description: 'Webhook and database forwarding configuration',
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
