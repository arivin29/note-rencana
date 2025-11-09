import { Component, ElementRef, HostListener, AfterViewInit } from '@angular/core';

declare var bootstrap: any;

@Component({
  selector: 'card',
  templateUrl: './card.component.html',
  host: {
  	'class': 'card'
  },
  standalone: false
})
export class CardComponent { }


@Component({
  selector: 'card-header',
  template: '<ng-content></ng-content>',
  host: {
  	'class': 'card-header d-block'
  },
  standalone: false
})
export class CardHeaderComponent { }


@Component({
  selector: 'card-body',
  template: '<ng-content></ng-content>',
  host: {
  	'class': 'card-body d-block'
  },
  standalone: false
})
export class CardBodyComponent { }


@Component({
  selector: 'card-footer',
  template: '<ng-content></ng-content>',
  host: {
  	'class': 'card-footer d-block'
  },
  standalone: false
})
export class CardFooterComponent { }


@Component({
  selector: 'card-img-overlay',
  template: '<ng-content></ng-content>',
  host: {
  	'class': 'card-img-overlay'
  },
  standalone: false
})
export class CardImgOverlayComponent { }


@Component({
  selector: 'card-group',
  template: '<ng-content></ng-content>',
  host: {
  	'class': 'card-group'
  },
  standalone: false
})
export class CardGroupComponent { }


@Component({
  selector: 'card-expand-toggler',
  template: '<ng-content></ng-content>',
  standalone: false
})
export class CardExpandTogglerComponent implements AfterViewInit {
	@HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
  	const elm = event.target as HTMLElement;
  	const target = elm.closest('.card');
  	
  	if (target) {
			const targetClass = 'card-expand';
			const targetTop = 40;

			if (document.body.classList.contains(targetClass) && target.classList.contains(targetClass)) {
				target.removeAttribute('style');
				target.classList.remove(targetClass);
				document.body.classList.remove(targetClass);
			} else {
				document.body.classList.add(targetClass);
				target.classList.add(targetClass);
			}

			window.dispatchEvent(new Event('resize'));
  	}
  }
  
  constructor(private elementRef: ElementRef) {}
  
  ngAfterViewInit() {
  	var elm = this.elementRef.nativeElement;
  	new bootstrap.Tooltip(elm, {
			title: 'Expand / Compress',
			placement: 'bottom',
			trigger: 'hover',
			container: 'body'
		});
  }
}