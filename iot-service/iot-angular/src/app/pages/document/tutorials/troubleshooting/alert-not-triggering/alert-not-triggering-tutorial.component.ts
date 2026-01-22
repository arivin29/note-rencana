import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-alert-not-triggering-tutorial',
  templateUrl: './alert-not-triggering-tutorial.component.html',
  styleUrls: ['./alert-not-triggering-tutorial.component.scss']
})
export class AlertNotTriggeringTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'troubleshooting-alerts',
    title: 'Alert Not Triggering',
    category: 'Troubleshooting',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'Debug alert rules',
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
