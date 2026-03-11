import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-node-detail-page',
  templateUrl: './node-detail-page.component.html',
  styleUrls: ['./node-detail-page.component.scss'],
  standalone: false
})
export class NodeDetailPageComponent implements OnInit, OnDestroy {
  projectId: string = '';
  nodeId: string = '';
  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get nodeId from current route params
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.nodeId = params.get('nodeId') || '';
    });

    // Get projectId from parent route
    if (this.route.parent?.paramMap) {
      this.route.parent.paramMap.subscribe(params => {
        this.projectId = params.get('projectId') || '';
      });
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['../../nodes'], { relativeTo: this.route });
  }
}
