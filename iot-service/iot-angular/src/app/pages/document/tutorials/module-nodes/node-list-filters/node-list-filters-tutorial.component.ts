import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-node-list-filters-tutorial',
  templateUrl: './node-list-filters-tutorial.component.html',
  styleUrls: ['./node-list-filters-tutorial.component.scss']
})
export class NodeListFiltersTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-nodes-list',
    title: 'Node List & Filters',
    category: 'Module: Nodes',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Browse, search, and filter nodes',
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
