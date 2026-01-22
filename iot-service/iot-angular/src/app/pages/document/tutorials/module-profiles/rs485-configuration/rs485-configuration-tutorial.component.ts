import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-rs485-configuration-tutorial',
  templateUrl: './rs485-configuration-tutorial.component.html',
  styleUrls: ['./rs485-configuration-tutorial.component.scss']
})
export class Rs485ConfigurationTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-profiles-rs485',
    title: 'RS485 Configuration',
    category: 'Module: Profiles',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Configure RS485 sensor profiles',
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
