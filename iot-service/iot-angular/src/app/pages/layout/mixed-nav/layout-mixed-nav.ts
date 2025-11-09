import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettings } from '../../../service/app-settings.service';

@Component({
  selector: 'layout-mixed-nav',
  templateUrl: './layout-mixed-nav.html',
  standalone: false
})

export class LayoutMixedNavPage {
	code1: any;

	constructor(private appSettings: AppSettings, private http: HttpClient) {
    this.appSettings.appTopNav = true;
  }
	
	ngOnInit() {this.http.get('/assets/data/layout-mixed-nav/code-1.json', { responseType: 'text' }).subscribe(data => {
    	this.code1 = data;
		});
  }

  ngOnDestroy() {
    this.appSettings.appTopNav = false;
  }
}
