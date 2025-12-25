import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-node-models-list-tutorial',
  templateUrl: './node-models-list-tutorial.component.html',
  styleUrls: ['./node-models-list-tutorial.component.scss']
})
export class NodeModelsListTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-node-models-list',
    title: 'Node Models List',
    category: 'Module: Node Models',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'View all device models (ESP32, etc)',
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
