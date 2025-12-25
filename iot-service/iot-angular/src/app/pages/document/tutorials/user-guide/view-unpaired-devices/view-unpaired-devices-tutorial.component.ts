import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-view-unpaired-devices-tutorial',
  templateUrl: './view-unpaired-devices-tutorial.component.html',
  styleUrls: ['./view-unpaired-devices-tutorial.component.scss']
})
export class ViewUnpairedDevicesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'user-view-unpaired-devices',
    title: 'View Unpaired Devices',
    category: 'User Guide',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'Check devices waiting for pairing',
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
