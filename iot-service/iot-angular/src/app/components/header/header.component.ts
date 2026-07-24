import { Component, Input, Output, EventEmitter, Renderer2, OnDestroy, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AppSettings } from '../../service/app-settings.service';
import { AuthService } from '../../services/auth.service';
import { ViewModeService } from '../../services/view-mode.service';
import { User } from '../../models/auth.model';
import { NotificationsService } from '../../../sdk/core/services/notifications.service';

declare var slideToggle: any;

interface NotificationData {
  id: string;
  icon: string;
  title: string;
  time: string;
  isRead: boolean;
  deepLink?: string;
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
	searchQuery: string = '';
	
	notificationData: NotificationData[] = [];
	unreadCount: number = 0;
	
	constructor(
		public appSettings: AppSettings,
		private authService: AuthService,
		private router: Router,
		private notificationsService: NotificationsService,
		private viewMode: ViewModeService
	) { }

	goMobile(): void {
		this.viewMode.set('mobile');
		this.router.navigateByUrl('/mobile/dashboard');
	}
	
	ngOnInit(): void {
		// Subscribe to auth state
		this.authService.currentUser$.subscribe(user => {
			this.currentUser = user;
			if (user) {
				this.loadNotifications();
				this.loadUnreadCount();
			}
		});
		
		this.authService.isAuthenticated$.subscribe(isAuth => {
			this.isAuthenticated = isAuth;
		});
		
		// Restore sidebar minified state from localStorage
		const savedMinified = localStorage.getItem('appSidebarMinified');
		if (savedMinified === 'true') {
			this.appSettings.appSidebarMinified = true;
		}
	}

	/**
	 * Load notifications from API
	 */
	loadNotifications(): void {
		this.notificationsService.notificationsControllerFindAll$Response({ limit: 5, isRead: false }).subscribe({
			next: (httpResponse) => {
				let response: any = httpResponse.body;
				if (typeof response === 'string') {
					response = JSON.parse(response);
				}
				this.notificationData = (response.data || []).map((item: any) => this.mapNotification(item));
			},
			error: (err) => {
				console.error('Error loading notifications:', err);
				this.notificationData = [];
			}
		});
	}

	/**
	 * Load unread notification count
	 */
	loadUnreadCount(): void {
		this.notificationsService.notificationsControllerGetUnreadCount$Response().subscribe({
			next: (httpResponse) => {
				let response: any = httpResponse.body;
				if (typeof response === 'string') {
					response = JSON.parse(response);
				}
				this.unreadCount = response.count || response.unreadCount || 0;
			},
			error: (err) => {
				console.error('Error loading unread count:', err);
				this.unreadCount = 0;
			}
		});
	}

	/**
	 * Mark all notifications as read
	 */
	markAllAsRead(): void {
		this.notificationsService.notificationsControllerMarkAllAsRead$Response().subscribe({
			next: () => {
				this.unreadCount = 0;
				this.notificationData.forEach(n => n.isRead = true);
			},
			error: (err) => console.error('Error marking all as read:', err)
		});
	}

	/**
	 * Map API response to NotificationData
	 */
	private mapNotification(item: any): NotificationData {
		return {
			// Backend memakai idNotification; `item.id` selalu undefined (bug lama).
			id: item.idNotification || item.id,
			icon: this.getNotificationIcon(item.type),
			title: item.title || 'Notification',
			time: this.getRelativeTime(item.createdAt || item.created_at),
			isRead: item.isRead || false,
			// Dispatcher menaruh tujuan asal event di data.deepLink (Dok 03).
			deepLink: item.data?.deepLink
		};
	}

	/**
	 * Buka notifikasi: tandai dibaca lalu lompat ke sumber event-nya.
	 */
	openNotification(notification: NotificationData): void {
		const target = notification.deepLink || '/iot/notifications';
		if (notification.id && !notification.isRead) {
			this.notificationsService.notificationsControllerMarkAsRead$Response({ id: notification.id }).subscribe({
				next: () => {
					notification.isRead = true;
					this.unreadCount = Math.max(0, this.unreadCount - 1);
				},
				error: (err) => console.error('Error marking notification as read:', err)
			});
		}
		this.router.navigateByUrl(target);
	}

	/**
	 * Get icon class based on notification type
	 */
	private getNotificationIcon(type: string): string {
		switch (type) {
			case 'alert': return 'bi bi-exclamation-triangle text-warning';
			case 'error': return 'bi bi-x-circle text-danger';
			case 'warning': return 'bi bi-exclamation-circle text-warning';
			case 'success': return 'bi bi-check-circle text-success';
			case 'info':
			default: return 'bi bi-info-circle text-theme';
		}
	}

	/**
	 * Convert timestamp to relative time string
	 */
	private getRelativeTime(dateStr: string): string {
		if (!dateStr) return '';
		const now = new Date();
		const date = new Date(dateStr);
		const diffMs = now.getTime() - date.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		
		if (diffMin < 1) return 'JUST NOW';
		if (diffMin < 60) return `${diffMin} MINUTE${diffMin > 1 ? 'S' : ''} AGO`;
		const diffHours = Math.floor(diffMin / 60);
		if (diffHours < 24) return `${diffHours} HOUR${diffHours > 1 ? 'S' : ''} AGO`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays} DAY${diffDays > 1 ? 'S' : ''} AGO`;
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
			// Toggle minified mode (icons only)
			this.appSettings.appSidebarMinified = !this.appSettings.appSidebarMinified;
			
			// Persist to localStorage
			localStorage.setItem('appSidebarMinified', String(this.appSettings.appSidebarMinified));
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

	/**
	 * Handle keyboard shortcut Cmd+K / Ctrl+K to open search
	 */
	@HostListener('document:keydown', ['$event'])
	handleKeyboardShortcut(event: KeyboardEvent) {
		// Cmd+K (Mac) or Ctrl+K (Windows/Linux)
		if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
			event.preventDefault();
			this.openSearch();
		}
	}

	/**
	 * Open search overlay in header
	 */
	openSearch() {
		const elm = document.getElementById('app');
		if (elm) {
			elm.classList.add('app-header-menu-search-toggled');
			// Focus the search input after a brief delay
			setTimeout(() => {
				const searchInput = document.querySelector('.menu-search input') as HTMLInputElement;
				if (searchInput) {
					searchInput.focus();
				}
			}, 100);
		}
	}

	/**
	 * Navigate to search page with query
	 */
	handleSearchSubmit(event: Event) {
		event.preventDefault();
		if (this.searchQuery.trim().length >= 2) {
			// Close the search overlay
			const elm = document.getElementById('app');
			if (elm) {
				elm.classList.remove('app-header-menu-search-toggled');
			}
			// Navigate to search page
			this.router.navigate(['/iot/search'], { 
				queryParams: { q: this.searchQuery.trim() } 
			});
			// Clear the search input
			this.searchQuery = '';
		}
	}

	/**
	 * Navigate to search page directly (click on search icon in header)
	 */
	goToSearchPage() {
		this.router.navigate(['/iot/search']);
	}
}
