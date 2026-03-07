import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-analytics-page',
  templateUrl: './analytics-page.component.html',
  styleUrls: ['./analytics-page.component.scss'],
  standalone: false
})
export class AnalyticsPageComponent implements OnInit {
  projectId = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
    });
  }
}
