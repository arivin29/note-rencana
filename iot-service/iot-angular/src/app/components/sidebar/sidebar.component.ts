import { Component, OnInit } from '@angular/core';
import { AppMenuService } from '../../service/app-menus.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  standalone: false
})

export class SidebarComponent implements OnInit {
	menus: any[] = [];
	
	constructor(private appMenuService: AppMenuService, private router: Router) { }
	
	ngOnInit() {
		this.menus = this.appMenuService.getAppMenus();
	}
	
	isActive(path: string) {
		return this.router.url === path;
	}
	
	isChildActive(menus: any) {
		var active = false;
		if (menus.length > 0) {
			for (let menu of menus) {
				if (this.router.url === menu.path) {
					active = true;
				}
			}
		}
		return active;
	}
	
	handleExpandSubmenu(event: MouseEvent) {
		event.preventDefault();
		var targetMenuLinkElm = event.target as HTMLElement;
		var targetMenuItemElm = targetMenuLinkElm.closest('.menu-item');
		
		if (targetMenuItemElm) {
			var targetSubmenu = targetMenuItemElm.querySelector('.menu-submenu');
			var targetSubmenuElm = targetSubmenu as HTMLElement;
			var hassubMenuLinkList = [].slice.call(document.querySelectorAll('.app-sidebar .menu > .menu-item.has-sub > .menu-link'));
			
			if (hassubMenuLinkList) {
				hassubMenuLinkList.map(function(menuLink) {
					var menuLinkElm = menuLink as HTMLElement;
					var menuItemElm = menuLinkElm.closest('.menu-item');
					
					if (menuItemElm) {
						var submenu = menuItemElm.querySelector('.menu-submenu');
						var submenuElm = submenu as HTMLElement;
					
						if (submenuElm != targetSubmenuElm) {
							submenuElm.style.display = 'none';
							menuItemElm.classList.remove('expand');
						}
					}
				});
			}
			
			if (targetMenuItemElm.classList.contains('expand') || (targetMenuItemElm.classList.contains('active') && !targetSubmenuElm.style.display)) {
				targetMenuItemElm.classList.remove('expand');
				targetSubmenuElm.style.display = 'none';
			} else {
				targetMenuItemElm.classList.add('expand');
				targetSubmenuElm.style.display = 'block';
			}
		}
	}
}
