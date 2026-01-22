import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-technical-specs-tutorial',
  templateUrl: './technical-specs-tutorial.component.html',
  styleUrls: ['./technical-specs-tutorial.component.scss']
})
export class TechnicalSpecsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'faq-technical',
    title: 'Technical Specs',
    category: 'FAQ',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'System requirements, limits',
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
