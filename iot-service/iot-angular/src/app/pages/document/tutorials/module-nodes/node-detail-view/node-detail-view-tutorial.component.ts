import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-node-detail-view-tutorial',
  templateUrl: './node-detail-view-tutorial.component.html',
  styleUrls: ['./node-detail-view-tutorial.component.scss']
})
export class NodeDetailViewTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-nodes-details',
    title: 'Node Detail View',
    category: 'Module: Nodes',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'View node information and status',
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
