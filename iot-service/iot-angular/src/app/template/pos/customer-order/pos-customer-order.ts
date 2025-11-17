import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppSettings } from '../../../service/app-settings.service';

declare var bootstrap: any;

interface DataResponse {
  order: string[];
  orderNo: string;
  orderHistory: string[];
  tableNo: string;
}

@Component({
  selector: 'pos-customer-order',
  templateUrl: './pos-customer-order.html',
  standalone: false
})

export class PosCustomerOrderPage {
	menu: any = {};
	order: any = {};
	orderNo: any = '#0000';
	orderHistory: any = {};
	tableNo: any = '0';
	modal: any = '';
	modalData: any = '';
	modalQuantity: any = '';
	modalSelectedSize: any = '';
	modalSelectedAddon: any = [];
	mobileSidebarToggled: boolean = false;
	
	constructor(private appSettings: AppSettings, private http: HttpClient) {
    this.appSettings.appHeaderNone = true;
    this.appSettings.appSidebarNone = true;
    this.appSettings.appContentClass = 'p-1 ps-xl-4 pe-xl-4 pt-xl-3 pb-xl-3';
    this.appSettings.appContentFullHeight = true;
  }
	
	showType(event: Event, type: string) {
		event.preventDefault();
		
		for (var i = 0; i < this.menu.category.length; i++) {
			if (this.menu.category[i].type == type) {
				this.menu.category[i].active = true;
			} else {
				this.menu.category[i].active = false;
			}
		}
		for (var i = 0; i < this.menu.food.length; i++) {
			if (this.menu.food[i].type == type || type == 'all') {
				this.menu.food[i].hide = false;
			} else {
				this.menu.food[i].hide = true;
			}
		}
	}
	
	showFoodModal(event: MouseEvent, id: string) {
		event.preventDefault();

		for (let i = 0; i < this.menu.food.length; i++) {
			if (this.menu.food[i].id == id) {
				this.modalData = this.menu.food[i];
			}
		}

		if (this.modalData.options && this.modalData.options.size) {
			this.modalSelectedSize = this.modalData.options.size[0].text;
		}

		this.modalQuantity = 1;
		this.modalSelectedAddon = [];

		const modalPosItem = document.getElementById('modalPosItem');
		if (modalPosItem) {
			this.modal = new bootstrap.Modal(modalPosItem);
			this.modal.show();
		}
	}
	
	deductQty(event: MouseEvent, id: string) {
		event.preventDefault();
		for (var i = 0; i < this.order.length; i++) {
			if (this.order[i].id == id) {
				var newQty = parseInt(this.order[i].quantity) - 1;
				
				if (newQty < 1) {
					newQty = 1;
				}
				this.order[i].quantity = newQty;
			}
		}
	}
	
	addQty(event: MouseEvent, id: string) {
		event.preventDefault();
		
		for (var i = 0; i < this.order.length; i++) {
			if (this.order[i].id == id) {
				var newQty = parseInt(this.order[i].quantity) + 1;
				
				this.order[i].quantity = newQty;
			}
		}
	}
	
	addToCart(event: MouseEvent) {
		event.preventDefault();
		
		this.modal.hide();
		var options = [];
		var extraPrice = 0;
		if (this.modalSelectedSize) {
			var option = {
				"key": "size",
				"value": this.modalSelectedSize
			};
			options.push(option);
			
			if (this.modalData.options && this.modalData.options.size) {
				for (var i = 0; i < this.modalData.options.size.length; i++) {
					if (this.modalData.options.size[i].text == this.modalSelectedSize) {
						extraPrice += parseFloat(this.modalData.options.size[i].price);
					}
				}
			}
		}
		if (this.modalSelectedAddon) {
			for (let addon in this.modalSelectedAddon) {
				var option2 = {
					"key": "addon",
					"value": addon
				};
				options.push(option2);
				
				if (this.modalData.options && this.modalData.options.addon) {
					for (var i = 0; i < this.modalData.options.addon.length; i++) {
						if (this.modalData.options.addon[i].text == addon) {
							extraPrice += parseFloat(this.modalData.options.addon[i].price);
						}
					}
				}
			}
		}
		
		var finalPrice = parseFloat(this.modalData.price) + extraPrice;
		
		this.order.push({
			"id": (this.order.length + 1),
			"image": this.modalData.image,
			"title": this.modalData.title,
			"price": finalPrice,
			"quantity": this.modalQuantity,
			"options": options
		});
	}
	
	addModalQty(event: MouseEvent) {
		event.preventDefault();
		
		this.modalQuantity = this.modalQuantity + 1;
	}
	
	deductModalQty(event: MouseEvent) {
		event.preventDefault();
		
		var newQty = parseInt(this.modalQuantity) - 1;
	
		if (newQty < 1) {
			newQty = 1;
		}
		this.modalQuantity = newQty;
	}
	
	toggleConfirmation(event: MouseEvent, id: number, value: boolean): void {
		event.preventDefault();

		for (let i = 0; i < this.order.length; i++) {
			if (this.order[i].id === id) {
				this.order[i].confirmation = value;
			}
		}
	}

	removeOrder(event: MouseEvent, id: number): void {
		event.preventDefault();

		for (let i = 0; i < this.order.length; i++) {
			if (this.order[i].id === id) {
				this.order.splice(i, 1);
			}
		}
	}
	
	toggleMobileSidebar(): void {
		this.mobileSidebarToggled = !this.mobileSidebarToggled;
	}

	getOrderTotal(): number {
		return (this.order) ? this.order.length : 0;
	}

	getOrderHistoryTotal(): number {
		return (this.orderHistory) ? this.orderHistory.length : 0;
	}

	getSubTotalPrice(): string {
		let value = 0;
		for (let i = 0; i < this.order.length; i++) {
			value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity);
		}
		return value.toFixed(2);
	}

	getTaxesPrice(): string {
		let value = 0;
		for (let i = 0; i < this.order.length; i++) {
			value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity) * 0.06;
		}
		return value.toFixed(2);
	}

	getTotalPrice(): string {
		let value = 0;
		for (let i = 0; i < this.order.length; i++) {
			value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity);
			value += parseFloat(this.order[i].price) * parseInt(this.order[i].quantity) * 0.06;
		}
		return value.toFixed(2);
	}
	
	ngOnInit() {
		this.http.get<DataResponse>('/assets/data/pos-customer-order/data.json', { responseType: 'json' }).subscribe((response: DataResponse) => {
			this.menu = response;
			this.order = response.order;
			this.orderNo = response.orderNo;
			this.orderHistory = response.orderHistory;
			this.tableNo = response.tableNo;
		});
  }

  ngOnDestroy() {
    this.appSettings.appHeaderNone = false;
    this.appSettings.appSidebarNone = false;
    this.appSettings.appContentClass = '';
    this.appSettings.appContentFullHeight = false;
  }
}
