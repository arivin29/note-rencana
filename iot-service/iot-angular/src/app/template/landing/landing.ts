import { Component, ViewEncapsulation } from '@angular/core';
import { AppSettings } from '../../service/app-settings.service';
import 'lity';

@Component({
  selector: 'landing',
  templateUrl: './landing.html',
  styleUrls: [ './landing.css' ],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})

export class LandingPage {
	constructor(private appSettings: AppSettings) {
    this.appSettings.appSidebarNone = true;
    this.appSettings.appHeaderNone = true;
    this.appSettings.appContentClass = 'p-0';
  }
  
  ngOnDestroy() {
    this.appSettings.appSidebarNone = false;
    this.appSettings.appHeaderNone = false;
    this.appSettings.appContentClass = '';
  }
  
  scrollToTarget(targetId: string) {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const scrollPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - 72;
      window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    }
  }
}
