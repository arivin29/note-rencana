import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-edit-node-model-tutorial',
  templateUrl: './edit-node-model-tutorial.component.html',
  styleUrls: ['./edit-node-model-tutorial.component.scss']
})
export class EditNodeModelTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-node-models-edit',
    title: 'Edit Node Model',
    category: 'Module: Node Models',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'Modify model specifications',
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
