import { Component } from '@angular/core';

@Component({
  selector: 'app-telemetry-aggregates-tutorial',
  templateUrl: './telemetry-aggregates-tutorial.component.html',
  styleUrls: ['./telemetry-aggregates-tutorial.component.scss'],
  standalone: false
})
export class TelemetryAggregatesTutorialComponent {
  sections = [
    { id: 'introduction', title: 'Apa itu Telemetry Aggregates?', completed: false },
    { id: 'access', title: 'Cara Akses', completed: false },
    { id: 'interface', title: 'Interface & Features', completed: false },
    { id: 'usage', title: 'Cara Menggunakan', completed: false },
    { id: 'understanding-data', title: 'Memahami Aggregated Data', completed: false },
    { id: 'scenarios', title: 'Contoh Penggunaan', completed: false },
    { id: 'tips', title: 'Tips & Best Practices', completed: false },
    { id: 'related', title: 'Tutorial Terkait', completed: false },
    { id: 'quick-reference', title: 'Quick Reference', completed: false }
  ];

  getProgressPercentage(): number {
    const completed = this.sections.filter(s => s.completed).length;
    return Math.round((completed / this.sections.length) * 100);
  }

  nextSection(): void {
    const currentIndex = this.sections.findIndex(s => !s.completed);
    if (currentIndex !== -1 && currentIndex < this.sections.length - 1) {
      this.sections[currentIndex].completed = true;
      document.getElementById(this.sections[currentIndex + 1].id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  previousSection(): void {
    const lastCompletedIndex = this.sections.map((s, i) => s.completed ? i : -1)
                                            .filter(i => i !== -1)
                                            .pop();
    if (lastCompletedIndex !== undefined && lastCompletedIndex > 0) {
      this.sections[lastCompletedIndex].completed = false;
      document.getElementById(this.sections[lastCompletedIndex - 1].id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  goToSection(index: number): void {
    document.getElementById(this.sections[index].id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
