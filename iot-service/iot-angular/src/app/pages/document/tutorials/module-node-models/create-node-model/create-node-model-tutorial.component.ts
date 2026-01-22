import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-create-node-model-tutorial',
  templateUrl: './create-node-model-tutorial.component.html',
  styleUrls: ['./create-node-model-tutorial.component.scss']
})
export class CreateNodeModelTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-node-models-create',
    title: 'Create Node Model',
    category: 'Module: Node Models',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Add new device model type',
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
