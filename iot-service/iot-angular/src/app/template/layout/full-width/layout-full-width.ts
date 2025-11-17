import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettings } from '../../../service/app-settings.service';

@Component({
  selector: 'layout-full-width',
  templateUrl: './layout-full-width.html',
  standalone: false
})

export class LayoutFullWidthPage {
	code1: any;

	constructor(private appSettings: AppSettings, private http: HttpClient) {
    this.appSettings.appSidebarNone = true;
    this.appSettings.appContentFullWidth = true;
  }
	
	ngOnInit() {
    this.http.get('/assets/data/layout-full-width/code-1.json', { responseType: 'text' }).subscribe(data => {
    	this.code1 = data;
		});
  }

  ngOnDestroy() {
    this.appSettings.appSidebarNone = false;
    this.appSettings.appContentFullWidth = false;
  }
}
