import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-alert-rules-tutorial',
  templateUrl: './alert-rules-tutorial.component.html',
  styleUrls: ['./alert-rules-tutorial.component.scss']
})
export class AlertRulesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-alerts-rules',
    title: 'Alert Rules',
    category: 'Module: Alerts',
    difficulty: 'beginner',
    estimatedTime: 12,
    description: 'Create alert conditions and rules',
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
