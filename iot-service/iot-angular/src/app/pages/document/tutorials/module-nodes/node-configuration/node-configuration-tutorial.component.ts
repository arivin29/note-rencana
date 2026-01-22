import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-node-configuration-tutorial',
  templateUrl: './node-configuration-tutorial.component.html',
  styleUrls: ['./node-configuration-tutorial.component.scss']
})
export class NodeConfigurationTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-nodes-config',
    title: 'Node Configuration',
    category: 'Module: Nodes',
    difficulty: 'beginner',
    estimatedTime: 7,
    description: 'Configure node settings',
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
