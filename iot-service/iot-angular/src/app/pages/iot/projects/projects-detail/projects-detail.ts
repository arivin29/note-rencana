import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'projects-detail',
  templateUrl: './projects-detail.html',
  styleUrls: ['./projects-detail.scss'],
  standalone: false
})
export class ProjectsDetailPage {
  projectId = '';

  constructor(route: ActivatedRoute) {
    route.paramMap.subscribe((params) => {
      this.projectId = params.get('projectId') ?? '';
    });
  }
}
