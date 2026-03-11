import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sensor-page',
  templateUrl: './sensor-page.component.html',
  styleUrls: ['./sensor-page.component.scss'],
  standalone: false
})
export class SensorPageComponent implements OnInit, OnDestroy {
  projectId: string = '';
  nodeId: string = '';
  sensorId: string = '';
  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get sensorId and nodeId from current route params
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.sensorId = params.get('sensorId') || '';
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
    // Navigate back to node detail
    if (this.nodeId) {
      this.router.navigate(['../../node', this.nodeId], { relativeTo: this.route });
    } else {
      this.router.navigate(['../../nodes'], { relativeTo: this.route });
    }
  }
}
