import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-general-questions-tutorial',
  templateUrl: './general-questions-tutorial.component.html',
  styleUrls: ['./general-questions-tutorial.component.scss']
})
export class GeneralQuestionsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'faq-general',
    title: 'General Questions',
    category: 'FAQ',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Common system questions',
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
