import { Component } from '@angular/core';

@Component({
  selector: 'footer',
  templateUrl: './footer.component.html',
  host: {
  	class: 'app-footer'
  },
  standalone: false
})

export class FooterComponent {
	year = new Date().getFullYear();
}
