import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TEMPLATE_CATEGORIES, TemplateCategory } from '../models/template.models';

@Component({
  selector: 'app-widget-create',
  standalone: false,
  templateUrl: './widget-create.component.html',
  styleUrls: ['./widget-create.component.scss']
})
export class WidgetCreateComponent implements OnInit {
  dashboardId: string = '';
  
  // Template categories for display
  categories: TemplateCategory[] = TEMPLATE_CATEGORIES;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.dashboardId = this.route.snapshot.paramMap.get('id') || '';
  }
  
  /**
   * Navigate to template wizard with selected category
   */
  selectCategory(category: TemplateCategory): void {
    this.router.navigate(['/iot/widget-builder', this.dashboardId, 'widget', 'template'], {
      queryParams: { category: category.id }
    });
  }
  
  /**
   * Navigate to expert mode (SQL editor)
   */
  openExpertMode(): void {
    // Navigate to existing widget wizard (add-widget route)
    this.router.navigate(['/iot/widget-builder', this.dashboardId, 'add-widget']);
  }
  
  /**
   * Go back to dashboard
   */
  goBack(): void {
    this.router.navigate(['/iot/widget-builder', this.dashboardId]);
  }
}
