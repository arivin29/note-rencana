import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-performance-issues-tutorial',
  templateUrl: './performance-issues-tutorial.component.html',
  styleUrls: ['./performance-issues-tutorial.component.scss']
})
export class PerformanceIssuesTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'troubleshooting-performance',
    title: 'Performance Issues',
    category: 'Troubleshooting',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Slow loading, timeout errors',
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
