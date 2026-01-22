import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class AppMenuService {
	getAppMenus() {
		return [
			{ 'text': 'Navigation', 'is_header': true },
			{ 'path': '/template/dashboard', 'icon': 'bi bi-cpu', 'text': 'Dashboard' }, 
			// { 'path': '/template/analytics', 'icon': 'bi bi-bar-chart', 'text': 'Analytics' }, 
			{ 'text': 'IoT Platform', 'is_header': true },
			{ 'path': '/iot/dashboard', 'icon': 'bi bi-speedometer2', 'text': 'Overview' },
			{ 'path': '/iot/dashboard-admin', 'icon': 'bi bi-shield-lock', 'text': 'Super Admin Dashboard', 'roles': ['admin'] },
			{ 'path': '/iot/projects', 'icon': 'bi bi-diagram-3', 'text': 'Projects', 'roles': ['admin','tenant'] },
			{ 'path': '/iot/owners', 'icon': 'bi bi-briefcase', 'text': 'Owners', 'roles': ['admin'], 'children': [
				{ 'path': '/iot/owners', 'text': 'Owner Directory' },
				{ 'path': '/iot/owners#delivery', 'text': 'Data Delivery Config' }
			]},
			{ 'path': '/iot/nodes', 'icon': 'bi bi-hdd-stack', 'text': 'Nodes' },
            { 'path': '/iot/unpaired-devices', 'icon': 'bi bi-hdd-network', 'text': 'Unpaired Devices', 'roles': ['admin', 'tenant'], 'badge': '3', 'badge_bg': 'bg-warning' },
			{ 'path': '/iot/alerts', 'icon': 'bi bi-bell', 'text': 'Alerts' },
			{ 'path': '/iot/telemetry', 'icon': 'bi bi-activity', 'text': 'Telemetry Logs' },
			{ 'path': '/iot/widgets-showcase', 'icon': 'bi bi-grid-1x2', 'text': 'Widget Showcase' },
			{ 'path': '/iot/config', 'icon': 'bi bi-sliders', 'text': 'IoT Config', 'roles': ['admin'] },
			{ 'is_divider': true },
			{ 'text': 'Help & Support', 'is_header': true },
			{ 'path': '/iot/document', 'icon': 'bi bi-book', 'text': 'Documentation', 'badge': 'NEW', 'badge_bg': 'bg-primary' },
			// { 'icon': 'bi bi-envelope', 'text': 'Email', 'children': [
			// 		{ 'path': '/template/email/inbox', 'action': 'Inbox', 'text': 'Inbox' },
			// 		{ 'path': '/template/email/compose', 'action': 'Compose', 'text': 'Compose' },
			// 		{ 'path': '/template/email/detail', 'action': 'Detail', 'text': 'Detail' }
			// 	]
			// },
			// { 'is_divider': true }, 
			// { 'text': 'Components', 'is_header': true }, 
			// { 'path': '/template/widgets', 'icon': 'bi bi-columns-gap', 'text': 'Widgets' }, 
			// { 'path': '/template/ai', 'icon': 'bi bi-stars', 'text': 'AI Studio', 'children': [
			// 	{ 'path': '/template/ai/chat', 'text': 'AI Chat'}, 
			// 	{ 'path': '/template/ai/image-generator', 	'text': 'AI Image Generator'}]
			// },
			// { 'path': '/template/pos', 'icon': 'bi bi-bag-check', 'text': 'POS System', 'children': [
			// 	{ 'path': '/template/pos/customer-order', 'text': 'Customer Order'}, 
			// 	{ 'path': '/template/pos/kitchen-order', 	'text': 'Kitchen Order'}, 
			// 	{ 'path': '/template/pos/counter-checkout', 	'text': 'Counter Checkout'}, 
			// 	{ 'path': '/template/pos/table-booking', 	'text': 'Table Booking'}, 
			// 	{ 'path': '/template/pos/menu-stock', 	'text': 'Menu Stock' }]
			// }, 
			// { 'path': '/template/ui', 'icon': 'fa fa-heart', 'text': 'UI Kits', 'children': [
			// 	{ 'path': '/template/ui/bootstrap', 	'text': 'Bootstrap'}, 
			// 	{ 'path': '/template/ui/buttons', 	'text': 'Buttons'}, 
			// 	{ 'path': '/template/ui/card', 	'text': 'Card'}, 
			// 	{ 'path': '/template/ui/icons', 	'text': 'Icons'}, 
			// 	{ 'path': '/template/ui/modal-notifications', 'text': 'Modal & Notifications'}, 
			// 	{ 'path': '/template/ui/typography', 	'text': 'Typography'}, 
			// 	{ 'path': '/template/ui/tabs-accordions', 	'text': 'Tabs & Accordions' }]
			// }, 
			// { 'path': '/template/form', 'icon': 'bi bi-pen', 'text': 'Forms', 'children': [
			// 	{ 'path': '/template/form/elements', 	'text': 'Form Elements'}, 
			// 	{ 'path': '/template/form/plugins', 	'text': 'Form Plugins'}, 
			// 	{ 'path': '/template/form/wizards', 	'text': 'Wizards' }]
			// }, 
			// { 'path': '/template/table', 'icon': 'bi bi-grid-3x3', 'text': 'Tables', 'children': [
			// 	{ 'path': '/template/table/elements', 	'text': 'Table Elements'}, 
			// 	{ 'path': '/template/table/plugins', 	'text': 'Table Plugins' }]
			// }, 
			// { 'path': '/template/chart', 'icon': 'bi bi-pie-chart', 'text': 'Charts', 'children': [
			// 	{ 'path': '/template/chart/js', 	'text': 'Chart.js'}, 
			// 	{ 'path': '/template/chart/apex', 	'text': 'Apexcharts.js' }]
			// }, 
			// { 'path': '/template/map', 'icon': 'bi bi-compass', 'text': 'Map' },
			// { 'path': '/template/layout', 'icon': 'bi bi-layout-sidebar', 'text': 'Layout', 'children': [
			// 	{ 'path': '/template/layout/starter', 	'text': 'Starter Page'}, 
			// 	{ 'path': '/template/layout/fixed-footer', 	'text': 'Fixed Footer'},  
			// 	{ 'path': '/template/layout/full-height', 	'text': 'Full Height'}, 
			// 	{ 'path': '/template/layout/full-width', 	'text': 'Full Width'},  
			// 	{ 'path': '/template/layout/boxed-layout', 	'text': 'Boxed Layout'},  
			// 	{ 'path': '/template/layout/collapsed-sidebar', 	'text': 'Collapsed Sidebar'},  
			// 	{ 'path': '/template/layout/top-nav', 	'text': 'Top Nav'},  
			// 	{ 'path': '/template/layout/mixed-nav', 	'text': 'Mixed Nav'},  
			// 	{ 'path': '/template/layout/mixed-nav-boxed-layout', 'text': 'Mixed Nav Boxed Layout'}]
			// },
			// { 'path': '/template/page', 'icon': 'bi bi-collection', 'text': 'Pages', 'children': [
			// 	{ 'path': '/template/page/scrum-board', 	'text': 'Scrum Board'}, 
			// 	{ 'path': '/template/page/products', 	'text': 'Products'}, 
			// 	{ 'path': '/template/page/product-details', 	'text': 'Product Details'}, 
			// 	{ 'path': '/template/page/orders', 	'text': 'Orders'}, 
			// 	{ 'path': '/template/page/order-details', 	'text': 'Order Details'}, 
			// 	{ 'path': '/template/page/gallery', 	'text': 'Gallery'}, 
			// 	{ 'path': '/template/page/search-results', 	'text': 'Search Results'}, 
			// 	{ 'path': '/template/page/coming-soon', 	'text': 'Coming Soon Page'}, 
			// 	{ 'path': '/template/page/error', 	'text': 'Error Page'}, 
			// 	{ 'path': '/template/page/login', 	'text': 'Login'}, 
			// 	{ 'path': '/template/page/register', 	'text': 'Register'}, 
			// 	{ 'path': '/template/page/messenger', 	'text': 'Messenger'}, 
			// 	{ 'path': '/template/page/data-management', 	'text': 'Data Management'}, 
			// 	{ 'path': '/template/page/file-manager', 	'text': 'File Manager'},
			// 	{ 'path': '/template/page/pricing', 	'text': 'Pricing Page'}]
			// },
			// { 'path': '/template/landing', 'icon': 'bi bi-diagram-3', 'text': 'Landing Page' }, 
			{ 'is_divider': true }, 
			{ 'text': 'Administration', 'is_header': true, 'roles': ['admin'] },
			{ 'path': '/admin/users', 'icon': 'bi bi-people-fill', 'text': 'User Management', 'roles': ['admin'] },
			{ 'path': '/admin/audit-logs', 'icon': 'bi bi-shield-check', 'text': 'Audit Logs', 'roles': ['admin'] },
			{ 'is_divider': true }, 
			{ 'text': 'Users', 'is_header': true }, 
			{ 'path': '/profile', 'icon': 'bi bi-people', 'text': 'Profile' }, 
			// { 'path': '/template/calendar', 'icon': 'bi bi-calendar4', 'text': 'Calendar' }, 
			// { 'path': '/template/settings', 'icon': 'bi bi-gear', 'text': 'Settings' },
			{ 'path': '/template/helper', 'icon': 'bi bi-gem', 'text': 'Helper' }
		];
	}

	/**
	 * Get menus filtered by user role
	 * @param userRole Current user's role ('admin' or 'tenant')
	 * @returns Filtered menu array
	 */
	getMenusByRole(userRole: string) {
		const allMenus = this.getAppMenus();
		return this.filterMenusByRole(allMenus, userRole);
	}

	/**
	 * Recursively filter menus based on role
	 */
	private filterMenusByRole(menus: any[], userRole: string): any[] {
		return menus.filter(menu => {
			// If menu has roles restriction
			if (menu.roles && Array.isArray(menu.roles)) {
				// Check if user role is in allowed roles
				if (!menu.roles.includes(userRole)) {
					return false;
				}
			}

			// If menu has children, filter them recursively
			if (menu.children && Array.isArray(menu.children)) {
				menu.children = this.filterMenusByRole(menu.children, userRole);
			}

			return true;
		});
	}

	/**
	 * Check if user has access to specific menu path
	 * @param path Menu path to check
	 * @param userRole Current user's role
	 * @returns True if user has access
	 */
	hasMenuAccess(path: string, userRole: string): boolean {
		const allMenus = this.getAppMenus();
		return this.checkMenuAccess(allMenus, path, userRole);
	}

	private checkMenuAccess(menus: any[], path: string, userRole: string): boolean {
		for (const menu of menus) {
			if (menu.path === path) {
				// If menu has role restriction, check it
				if (menu.roles && Array.isArray(menu.roles)) {
					return menu.roles.includes(userRole);
				}
				// No role restriction means accessible to all
				return true;
			}

			// Check children recursively
			if (menu.children && Array.isArray(menu.children)) {
				const hasAccess = this.checkMenuAccess(menu.children, path, userRole);
				if (hasAccess !== undefined) {
					return hasAccess;
				}
			}
		}

		// Path not found in menus, allow by default
		return true;
	}
}
