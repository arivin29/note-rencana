import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sla-contact-settings-tutorial',
  templateUrl: './sla-contact-settings-tutorial.component.html',
  styleUrls: ['./sla-contact-settings-tutorial.component.scss']
})
export class SlaContactSettingsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'owner-sla-settings',
    title: 'SLA & Contact Settings',
    category: 'Owner Guide',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Configure SLA levels and contacts',
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
