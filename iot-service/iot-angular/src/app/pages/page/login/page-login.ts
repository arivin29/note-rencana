import { Component } from '@angular/core';
import { Router }    from '@angular/router';
import { NgForm }    from '@angular/forms';
import { AppSettings } from '../../../service/app-settings.service';

@Component({
  selector: 'page-login',
  templateUrl: './page-login.html',
  standalone: false
})

export class LoginPage {
  constructor(private router: Router, private appSettings: AppSettings) {
    this.appSettings.appSidebarNone = true;
    this.appSettings.appHeaderNone = true;
    this.appSettings.appContentClass = 'p-0';
  }
  
  ngOnDestroy() {
    this.appSettings.appSidebarNone = false;
    this.appSettings.appHeaderNone = false;
    this.appSettings.appContentClass = '';
  }
  
	formSubmit(f: NgForm) {
    this.router.navigate(['/']);
  }
}
