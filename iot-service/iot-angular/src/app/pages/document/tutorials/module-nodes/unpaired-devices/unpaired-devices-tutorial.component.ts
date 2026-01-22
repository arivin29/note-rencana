import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-unpaired-devices-tutorial',
  templateUrl: './unpaired-devices-tutorial.component.html',
  styleUrls: ['./unpaired-devices-tutorial.component.scss']
})
export class UnpairedDevicesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-nodes-unpaired',
    title: 'Unpaired Devices',
    category: 'Module: Nodes',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'View and pair unpaired devices',
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
