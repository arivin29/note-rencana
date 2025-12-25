import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-node-pairing-tutorial',
  templateUrl: './node-pairing-tutorial.component.html',
  styleUrls: ['./node-pairing-tutorial.component.scss']
})
export class NodePairingTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-nodes-pairing',
    title: 'Node Pairing',
    category: 'Module: Nodes',
    difficulty: 'beginner',
    estimatedTime: 12,
    description: 'Pair new devices with QR code scan',
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
