import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'owners-detail',
  templateUrl: './owners-detail.html',
  styleUrls: ['./owners-detail.scss'],
  standalone: false
})
export class OwnersDetailPage {
  ownerId = '';

  constructor(route: ActivatedRoute) {
    route.paramMap.subscribe((params) => {
      this.ownerId = params.get('ownerId') ?? '';
    });
  }
}
