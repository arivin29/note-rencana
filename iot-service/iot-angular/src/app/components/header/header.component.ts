import { Component, Input, Output, EventEmitter, Renderer2, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppSettings } from '../../service/app-settings.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.model';

declare var slideToggle: any;

interface NotificationData {
  icon: string;
  title: string;
  time: string;
}

@Component({
  selector: 'header',
  templateUrl: './header.component.html',
  host: {
  	class: 'app-header'
  },
  standalone: false
})
export class HeaderComponent implements OnInit {
	currentUser: User | null = null;
	isAuthenticated: boolean = false;
	
	notificationData : NotificationData[] = [{
		icon: 'bi bi-bag text-theme',
		title: 'NEW ORDER RECEIVED ($1,299)',
		time: 'JUST NOW'
	},{
		icon: 'bi bi-person-circle text-theme',
		title: '3 NEW ACCOUNT CREATED',
		time: '2 MINUTES AGO'
	},{
		icon: 'bi bi-gear text-theme',
		title: 'SETUP COMPLETED',
		time: '3 MINUTES AGO'
	},{
		icon: 'bi bi-grid text-theme',
		title: 'WIDGET INSTALLATION DONE',
		time: '5 MINUTES AGO'
	},{
		icon: 'bi bi-credit-card text-theme',
		title: 'PAYMENT METHOD ENABLED',
		time: '10 MINUTES AGO'
	}];
	
	constructor(
		public appSettings: AppSettings,
		private authService: AuthService,
		private router: Router
	) { }
	
	ngOnInit(): void {
		// Subscribe to auth state
		this.authService.currentUser$.subscribe(user => {
			this.currentUser = user;
		});
		
		this.authService.isAuthenticated$.subscribe(isAuth => {
			this.isAuthenticated = isAuth;
		});
	}
	
	/**
	 * Get user initials for avatar
	 */
	getUserInitials(): string {
		if (!this.currentUser) return 'U';
		return this.currentUser.name.charAt(0).toUpperCase();
	}
	
	/**
	 * Get role badge class
	 */
	getRoleBadgeClass(): string {
		if (!this.currentUser) return 'badge-secondary';
		return this.currentUser.role === 'admin' ? 'badge-danger' : 'badge-primary';
	}
	
	/**
	 * Handle logout
	 */
	handleLogout(): void {
		if (confirm('Are you sure you want to logout?')) {
			this.authService.logout();
		}
	}
	
	handleToggleSidebarCollapsed(event: MouseEvent) {
		event.preventDefault();
		
		if (!this.appSettings.appSidebarNone) {
			var elm = document.getElementById('app');
			if (elm) {
				elm.classList.toggle('app-sidebar-collapsed');
			}
		}
	}
	
	handleToggleMobileSidebar(event: MouseEvent) {
		event.preventDefault();
		
		if (!(this.appSettings.appSidebarNone && this.appSettings.appTopNav)) {
			var elm = document.getElementById('app');
			if (elm) {
				elm.classList.toggle('app-sidebar-mobile-toggled');
			}
		} else {
			slideToggle(document.querySelector('.app-top-nav'));
			window.scrollTo(0, 0);
		}
	}
	
	handleAppToggleClass(event: MouseEvent, className: string) {
		event.preventDefault();
		
		var elm = document.getElementById('app');
		if (elm) {
			elm.classList.toggle(className);
		}
	}
}
