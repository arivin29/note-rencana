import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tutorial, TutorialCategory } from './models/tutorial.model';
import { TutorialService } from './services/tutorial/tutorial.service';

@Component({
  selector: 'app-document',
  standalone: false,
  templateUrl: './document.component.html',
  styleUrls: ['./document.component.scss']
})
export class DocumentComponent implements OnInit {
  selectedCategory: TutorialCategory | null = null;
  selectedTutorial: Tutorial | null = null;
  tutorials: Tutorial[] = [];
  searchQuery = '';
  sidebarExpanded = true;

  constructor(
    private route: ActivatedRoute,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    // Load tutorials
    this.tutorialService.getAllTutorials().subscribe(tutorials => {
      this.tutorials = tutorials;
    });

    // Listen to route params
    this.route.params.subscribe(params => {
      if (params['category']) {
        this.selectedCategory = params['category'] as TutorialCategory;
        this.loadCategoryTutorials();
      }
      if (params['tutorialId']) {
        this.loadTutorial(params['tutorialId']);
      }
    });
  }

  loadCategoryTutorials(): void {
    if (this.selectedCategory) {
      this.tutorialService.getTutorialsByCategory(this.selectedCategory).subscribe(tutorials => {
        this.tutorials = tutorials;
      });
    }
  }

  loadTutorial(id: string): void {
    this.tutorialService.getTutorialById(id).subscribe(tutorial => {
      this.selectedTutorial = tutorial || null;
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.tutorialService.searchTutorials(this.searchQuery).subscribe(tutorials => {
        this.tutorials = tutorials;
      });
    } else {
      this.tutorialService.getAllTutorials().subscribe(tutorials => {
        this.tutorials = tutorials;
      });
    }
  }

  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
  }
}
