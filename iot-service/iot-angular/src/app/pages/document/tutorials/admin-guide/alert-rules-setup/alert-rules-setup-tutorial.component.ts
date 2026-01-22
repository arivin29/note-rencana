import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-alert-rules-setup-tutorial',
  templateUrl: './alert-rules-setup-tutorial.component.html',
  styleUrls: ['./alert-rules-setup-tutorial.component.scss']
})
export class AlertRulesSetupTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'admin-alert-rules',
    title: 'Alert Rules Setup',
    category: 'Admin Guide',
    difficulty: 'beginner',
    estimatedTime: 12,
    description: 'Create alert rules and conditions',
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
