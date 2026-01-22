import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tutorial, TutorialCategory } from '../../models/tutorial.model';
import { TutorialService } from '../../services/tutorial/tutorial.service';

@Component({
  selector: 'app-tutorial-category',
  standalone: false,
  templateUrl: './tutorial-category.component.html',
  styleUrls: ['./tutorial-category.component.scss']
})
export class TutorialCategoryComponent implements OnInit {
  tutorials: Tutorial[] = [];
  category: TutorialCategory | null = null;

  constructor(
    private route: ActivatedRoute,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['category']) {
        this.category = params['category'] as TutorialCategory;
        this.loadCategoryTutorials();
      }
    });
  }

  loadCategoryTutorials(): void {
    if (this.category) {
      this.tutorialService.getTutorialsByCategory(this.category).subscribe(tutorials => {
        this.tutorials = tutorials;
      });
    }
  }
}
