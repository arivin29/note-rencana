import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-data-privacy-tutorial',
  templateUrl: './data-privacy-tutorial.component.html',
  styleUrls: ['./data-privacy-tutorial.component.scss']
})
export class DataPrivacyTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'faq-privacy',
    title: 'Data & Privacy',
    category: 'FAQ',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'Data retention, privacy',
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
