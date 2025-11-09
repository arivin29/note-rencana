import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettings } from '../../../service/app-settings.service';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: string;
}

@Component({
  selector: 'pos-kitchen-order',
  templateUrl: './pos-kitchen-order.html',
  standalone: false
})

export class PosKitchenOrderPage {
	order: any;

	constructor(private appSettings: AppSettings, private http: HttpClient) {
    this.appSettings.appHeaderNone = true;
    this.appSettings.appSidebarNone = true;
    this.appSettings.appContentClass = 'p-1 ps-xl-4 pe-xl-4 pt-xl-3 pb-xl-3';
    this.appSettings.appContentFullHeight = true;
  }
	
	checkTime(i: any) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
  }

  getTime() {
    var today = new Date();
    var h = today.getHours();
    var m = today.getMinutes();
    var s = today.getSeconds();
    var a;
    m = this.checkTime(m);
    s = this.checkTime(s);
    a = (h > 11) ? 'pm' : 'am';
    h = (h > 12) ? h - 12 : h;

    setTimeout(() => this.getTime(), 500);

    return h + ":" + m + a;
  }

  getTotalCompletedItems(items: any) {
    var count = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].status == 'Completed') {
        count++;
      }
    }
    return count;
  }

  setItemStatus(event: MouseEvent, item: any, status: any) {
    event.preventDefault();

    if (confirm('Confirm set this order to ' + status + '?') === true) {
      item.status = status;
    }
  }
	
	ngOnInit() {
		this.http.get('/assets/data/pos-kitchen-order/data.json', { responseType: 'json' }).subscribe((response) => {
    	this.order = response;
		});
  }

  ngOnDestroy() {
    this.appSettings.appHeaderNone = false;
    this.appSettings.appSidebarNone = false;
    this.appSettings.appContentClass = '';
    this.appSettings.appContentFullHeight = false;
  }
}
