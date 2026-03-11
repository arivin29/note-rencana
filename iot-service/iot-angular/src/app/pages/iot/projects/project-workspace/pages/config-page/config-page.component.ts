import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-config-page',
  templateUrl: './config-page.component.html',
  styleUrls: ['./config-page.component.scss'],
  standalone: false
})
export class ConfigPageComponent implements OnInit {
  projectId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
    });
  }

  editProject() {
    this.router.navigate(['/iot/projects', this.projectId, 'edit']);
  }
}
