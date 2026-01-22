import { Component, Input, OnInit } from '@angular/core';
import { Tutorial, TutorialProgress } from '../../models/tutorial.model';
import { TutorialService } from '../../services/tutorial/tutorial.service';

@Component({
  selector: 'app-tutorial-viewer',
  standalone: false,
  templateUrl: './tutorial-viewer.component.html',
  styleUrls: ['./tutorial-viewer.component.scss']
})
export class TutorialViewerComponent implements OnInit {
  @Input() tutorial!: Tutorial;
  
  currentSectionIndex = 0;
  completedSections: Set<string> = new Set();
  progress: TutorialProgress | null = null;

  constructor(private tutorialService: TutorialService) {}

  ngOnInit(): void {
    if (this.tutorial) {
      this.loadProgress();
    }
  }

  loadProgress(): void {
    const userId = 'current-user'; // TODO: Get from auth service
    this.progress = this.tutorialService.getProgress(userId, this.tutorial.metadata.id);
    if (this.progress) {
      this.completedSections = new Set(this.progress.completedSections);
      this.currentSectionIndex = this.progress.currentSection;
    }
  }

  nextSection(): void {
    if (this.currentSectionIndex < this.tutorial.sections.length - 1) {
      this.markCurrentSectionCompleted();
      this.currentSectionIndex++;
    }
  }

  previousSection(): void {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
    }
  }

  goToSection(index: number): void {
    this.currentSectionIndex = index;
  }

  get currentSection() {
    return this.tutorial?.sections[this.currentSectionIndex] || null;
  }

  markCurrentSectionCompleted(): void {
    const userId = 'current-user'; // TODO: Get from auth service
    const sectionId = this.tutorial.sections[this.currentSectionIndex].id;
    this.tutorialService.markSectionCompleted(userId, this.tutorial.metadata.id);
    this.completedSections.add(sectionId);
  }

  isSectionCompleted(sectionId: string): boolean {
    return this.completedSections.has(sectionId);
  }

  getProgressPercentage(): number {
    if (!this.tutorial || this.tutorial.sections.length === 0) {
      return 0;
    }
    return (this.completedSections.size / this.tutorial.sections.length) * 100;
  }

  markAsCompleted(): void {
    const userId = 'current-user'; // TODO: Get from auth service
    // Mark all sections as completed
    this.tutorial.sections.forEach(section => {
      this.tutorialService.markSectionCompleted(
        userId, 
        this.tutorial.metadata.id
      );
      this.completedSections.add(section.id);
    });
  }
}
