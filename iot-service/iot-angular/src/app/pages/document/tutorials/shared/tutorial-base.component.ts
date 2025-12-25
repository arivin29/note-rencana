import { Component, OnInit } from '@angular/core';
import { TutorialMetadataConfig, TutorialSection } from './tutorial-metadata.interface';

/**
 * Base class for all tutorial components
 * Provides common functionality for progress tracking, navigation, etc.
 */
@Component({
  template: ''
})
export abstract class TutorialBaseComponent implements OnInit {
  // Metadata that each tutorial must define
  abstract metadata: TutorialMetadataConfig;
  
  // Sections getter - can be overridden or derived from metadata
  get sections(): TutorialSection[] {
    return this.metadata.sections || [];
  }
  
  // Progress tracking
  currentSection = 0;
  completedSections: Set<number> = new Set();

  ngOnInit(): void {
    this.loadProgress();
  }

  /**
   * Load progress from localStorage
   */
  loadProgress(): void {
    const saved = localStorage.getItem(`tutorial-progress-${this.metadata.id}`);
    if (saved) {
      const data = JSON.parse(saved);
      this.currentSection = data.currentSection || 0;
      this.completedSections = new Set(data.completedSections || []);
    }
  }

  /**
   * Save progress to localStorage
   */
  saveProgress(): void {
    const data = {
      currentSection: this.currentSection,
      completedSections: Array.from(this.completedSections),
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(`tutorial-progress-${this.metadata.id}`, JSON.stringify(data));
  }

  /**
   * Navigate to next section
   */
  nextSection(): void {
    if (this.currentSection < this.sections.length - 1) {
      this.markCurrentSectionCompleted();
      this.currentSection++;
      this.saveProgress();
      this.scrollToTop();
    }
  }

  /**
   * Navigate to previous section
   */
  previousSection(): void {
    if (this.currentSection > 0) {
      this.currentSection--;
      this.saveProgress();
      this.scrollToTop();
    }
  }

  /**
   * Jump to specific section
   */
  goToSection(index: number): void {
    if (index >= 0 && index < this.sections.length) {
      this.currentSection = index;
      this.saveProgress();
      this.scrollToTop();
    }
  }

  /**
   * Mark current section as completed
   */
  markCurrentSectionCompleted(): void {
    this.completedSections.add(this.currentSection);
    this.saveProgress();
  }

  /**
   * Check if section is completed
   */
  isSectionCompleted(index: number): boolean {
    return this.completedSections.has(index);
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(): number {
    if (this.sections.length === 0) return 0;
    return Math.round((this.completedSections.size / this.sections.length) * 100);
  }

  /**
   * Mark entire tutorial as completed
   */
  markAsCompleted(): void {
    for (let i = 0; i < this.sections.length; i++) {
      this.completedSections.add(i);
    }
    this.saveProgress();
  }

  /**
   * Reset tutorial progress
   */
  resetProgress(): void {
    this.currentSection = 0;
    this.completedSections.clear();
    localStorage.removeItem(`tutorial-progress-${this.metadata.id}`);
  }

  /**
   * Scroll to top of content
   */
  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Get difficulty badge class
   */
  getDifficultyClass(): string {
    switch (this.metadata.difficulty) {
      case 'beginner':
        return 'bg-success';
      case 'intermediate':
        return 'bg-warning';
      case 'advanced':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }
}
