import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class AppMenuService {
	getAppMenus() {
		return [
			{ 'text': 'Navigation', 'is_header': true },
			{ 'path': '/dashboard', 'icon': 'bi bi-cpu', 'text': 'Dashboard' }, 
			{ 'path': '/analytics', 'icon': 'bi bi-bar-chart', 'text': 'Analytics' }, 
			{ 'text': 'IoT Platform', 'is_header': true },
			{ 'path': '/iot/dashboard', 'icon': 'bi bi-speedometer2', 'text': 'Overview' },
			{ 'path': '/iot/projects', 'icon': 'bi bi-diagram-3', 'text': 'Projects' },
			{ 'path': '/iot/owners', 'icon': 'bi bi-briefcase', 'text': 'Owners', 'children': [
				{ 'path': '/iot/owners', 'text': 'Owner Directory' },
				{ 'path': '/iot/owners#delivery', 'text': 'Data Delivery Config' }
			]},
			{ 'path': '/iot/nodes', 'icon': 'bi bi-hdd-stack', 'text': 'Nodes' },
			{ 'path': '/iot/alerts', 'icon': 'bi bi-bell', 'text': 'Alerts' },
			{ 'path': '/iot/telemetry', 'icon': 'bi bi-activity', 'text': 'Telemetry Logs' },
			{ 'path': '/iot/widgets-showcase', 'icon': 'bi bi-grid-1x2', 'text': 'Widget Showcase' },
			{ 'path': '/iot/config', 'icon': 'bi bi-sliders', 'text': 'IoT Config' },
			{ 'icon': 'bi bi-envelope', 'text': 'Email', 'children': [
					{ 'path': '/email/inbox', 'action': 'Inbox', 'text': 'Inbox' },
					{ 'path': '/email/compose', 'action': 'Compose', 'text': 'Compose' },
					{ 'path': '/email/detail', 'action': 'Detail', 'text': 'Detail' }
				]
			},
			{ 'is_divider': true }, 
			{ 'text': 'Components', 'is_header': true }, 
			{ 'path': '/widgets', 'icon': 'bi bi-columns-gap', 'text': 'Widgets' }, 
			{ 'path': '/ai', 'icon': 'bi bi-stars', 'text': 'AI Studio', 'children': [
				{ 'path': '/ai/chat', 'text': 'AI Chat'}, 
				{ 'path': '/ai/image-generator', 	'text': 'AI Image Generator'}]
			},
			{ 'path': '/pos', 'icon': 'bi bi-bag-check', 'text': 'POS System', 'children': [
				{ 'path': '/pos/customer-order', 'text': 'Customer Order'}, 
				{ 'path': '/pos/kitchen-order', 	'text': 'Kitchen Order'}, 
				{ 'path': '/pos/counter-checkout', 	'text': 'Counter Checkout'}, 
				{ 'path': '/pos/table-booking', 	'text': 'Table Booking'}, 
				{ 'path': '/pos/menu-stock', 	'text': 'Menu Stock' }]
			}, 
			{ 'path': '/ui', 'icon': 'fa fa-heart', 'text': 'UI Kits', 'children': [
				{ 'path': '/ui/bootstrap', 	'text': 'Bootstrap'}, 
				{ 'path': '/ui/buttons', 	'text': 'Buttons'}, 
				{ 'path': '/ui/card', 	'text': 'Card'}, 
				{ 'path': '/ui/icons', 	'text': 'Icons'}, 
				{ 'path': '/ui/modal-notifications', 'text': 'Modal & Notifications'}, 
				{ 'path': '/ui/typography', 	'text': 'Typography'}, 
				{ 'path': '/ui/tabs-accordions', 	'text': 'Tabs & Accordions' }]
			}, 
			{ 'path': '/form', 'icon': 'bi bi-pen', 'text': 'Forms', 'children': [
				{ 'path': '/form/elements', 	'text': 'Form Elements'}, 
				{ 'path': '/form/plugins', 	'text': 'Form Plugins'}, 
				{ 'path': '/form/wizards', 	'text': 'Wizards' }]
			}, 
			{ 'path': '/table', 'icon': 'bi bi-grid-3x3', 'text': 'Tables', 'children': [
				{ 'path': '/table/elements', 	'text': 'Table Elements'}, 
				{ 'path': '/table/plugins', 	'text': 'Table Plugins' }]
			}, 
			{ 'path': '/chart', 'icon': 'bi bi-pie-chart', 'text': 'Charts', 'children': [
				{ 'path': '/chart/js', 	'text': 'Chart.js'}, 
				{ 'path': '/chart/apex', 	'text': 'Apexcharts.js' }]
			}, 
			{ 'path': '/map', 'icon': 'bi bi-compass', 'text': 'Map' },
			{ 'path': '/layout', 'icon': 'bi bi-layout-sidebar', 'text': 'Layout', 'children': [
				{ 'path': '/layout/starter', 	'text': 'Starter Page'}, 
				{ 'path': '/layout/fixed-footer', 	'text': 'Fixed Footer'},  
				{ 'path': '/layout/full-height', 	'text': 'Full Height'}, 
				{ 'path': '/layout/full-width', 	'text': 'Full Width'},  
				{ 'path': '/layout/boxed-layout', 	'text': 'Boxed Layout'},  
				{ 'path': '/layout/collapsed-sidebar', 	'text': 'Collapsed Sidebar'},  
				{ 'path': '/layout/top-nav', 	'text': 'Top Nav'},  
				{ 'path': '/layout/mixed-nav', 	'text': 'Mixed Nav'},  
				{ 'path': '/layout/mixed-nav-boxed-layout', 'text': 'Mixed Nav Boxed Layout'}]
			},
			{ 'path': '/page', 'icon': 'bi bi-collection', 'text': 'Pages', 'children': [
				{ 'path': '/page/scrum-board', 	'text': 'Scrum Board'}, 
				{ 'path': '/page/products', 	'text': 'Products'}, 
				{ 'path': '/page/product-details', 	'text': 'Product Details'}, 
				{ 'path': '/page/orders', 	'text': 'Orders'}, 
				{ 'path': '/page/order-details', 	'text': 'Order Details'}, 
				{ 'path': '/page/gallery', 	'text': 'Gallery'}, 
				{ 'path': '/page/search-results', 	'text': 'Search Results'}, 
				{ 'path': '/page/coming-soon', 	'text': 'Coming Soon Page'}, 
				{ 'path': '/page/error', 	'text': 'Error Page'}, 
				{ 'path': '/page/login', 	'text': 'Login'}, 
				{ 'path': '/page/register', 	'text': 'Register'}, 
				{ 'path': '/page/messenger', 	'text': 'Messenger'}, 
				{ 'path': '/page/data-management', 	'text': 'Data Management'}, 
				{ 'path': '/page/file-manager', 	'text': 'File Manager'},
				{ 'path': '/page/pricing', 	'text': 'Pricing Page'}]
			},
			{ 'path': '/landing', 'icon': 'bi bi-diagram-3', 'text': 'Landing Page' }, 
			{ 'is_divider': true }, 
			{ 'text': 'Users', 'is_header': true }, 
			{ 'path': '/profile', 'icon': 'bi bi-people', 'text': 'Profile' }, 
			{ 'path': '/calendar', 'icon': 'bi bi-calendar4', 'text': 'Calendar' }, 
			{ 'path': '/settings', 'icon': 'bi bi-gear', 'text': 'Settings' },
			{ 'path': '/helper', 'icon': 'bi bi-gem', 'text': 'Helper' }
		];
	}
}
