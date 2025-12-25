import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Tutorial, TutorialDifficulty } from '../../models/tutorial.model';

@Component({
  selector: 'app-tutorial-list',
  standalone: false,
  templateUrl: './tutorial-list.component.html',
  styleUrls: ['./tutorial-list.component.scss']
})
export class TutorialListComponent {
  @Input() tutorials: Tutorial[] = [];
  @Input() category: string | null = null;

  constructor(private router: Router) {}

  openTutorial(tutorial: Tutorial): void {
    // Use path if available, otherwise fallback to category/id
    const tutorialPath = tutorial.metadata.path || `${tutorial.metadata.category}/${tutorial.metadata.id}`;
    // Split path into segments for proper routing (e.g., 'user-guide/dashboard-overview' -> ['user-guide', 'dashboard-overview'])
    const pathSegments = tutorialPath.split('/');
    this.router.navigate(['/iot/document', ...pathSegments]);
  }

  getDifficultyColor(difficulty: TutorialDifficulty): string {
    switch (difficulty) {
      case 'beginner':
        return 'primary';
      case 'intermediate':
        return 'accent';
      case 'advanced':
        return 'warn';
      default:
        return 'primary';
    }
  }
}
