import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'owners-edit',
  templateUrl: './owners-edit.html',
  styleUrls: ['./owners-edit.scss'],
  standalone: false
})
export class OwnersEditPage {
  ownerId = '';

  constructor(route: ActivatedRoute) {
    route.paramMap.subscribe((params) => {
      this.ownerId = params.get('ownerId') ?? '';
    });
  }
}
