import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-nodes-page',
  templateUrl: './nodes-page.component.html',
  styleUrls: ['./nodes-page.component.scss'],
  standalone: false
})
export class NodesPageComponent implements OnInit {
  projectId = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Get projectId from parent route
    this.route.parent?.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
    });
  }
}
