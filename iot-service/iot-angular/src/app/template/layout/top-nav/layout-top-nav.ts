import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettings } from '../../../service/app-settings.service';

@Component({
  selector: 'layout-top-nav',
  templateUrl: './layout-top-nav.html',
  standalone: false
})

export class LayoutTopNavPage {
	code1: any;

	constructor(private appSettings: AppSettings, private http: HttpClient) {
    this.appSettings.appTopNav = true;
    this.appSettings.appSidebarNone = true;
  }
	
	ngOnInit() {this.http.get('/assets/data/layout-top-nav/code-1.json', { responseType: 'text' }).subscribe(data => {
    	this.code1 = data;
		});
  }

  ngOnDestroy() {
    this.appSettings.appTopNav = false;
    this.appSettings.appSidebarNone = false;
  }
}
