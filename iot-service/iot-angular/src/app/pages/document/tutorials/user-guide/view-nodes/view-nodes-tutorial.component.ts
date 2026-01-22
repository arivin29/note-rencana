import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-view-nodes-tutorial',
  templateUrl: './view-nodes-tutorial.component.html',
  styleUrls: ['./view-nodes-tutorial.component.scss']
})
export class ViewNodesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'user-view-nodes',
    title: 'View Nodes',
    category: 'User Guide',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Browse connected devices and their status',
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
