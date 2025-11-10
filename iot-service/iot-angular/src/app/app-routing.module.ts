import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardPage } from './pages/dashboard/dashboard';
import { IotDashboardPage } from './pages/iot/dashboard/iot-dashboard';
import { IotAlertsPage } from './pages/iot/alerts/iot-alerts';
import { WidgetsShowcasePage } from './pages/iot/widgets-showcase/widgets-showcase';

import { AnalyticsPage } from './pages/analytics/analytics';

import { EmailInboxPage } from './pages/email/inbox/email-inbox';
import { EmailComposePage } from './pages/email/compose/email-compose';
import { EmailDetailPage } from './pages/email/detail/email-detail';

import { WidgetsPage } from './pages/widgets/widgets';

import { AiChatPage } from './pages/ai/chat/ai-chat';
import { AiImageGeneratorPage } from './pages/ai/image-generator/ai-image-generator';

import { PosCustomerOrderPage } from './pages/pos/customer-order/pos-customer-order';
import { PosKitchenOrderPage } from './pages/pos/kitchen-order/pos-kitchen-order';
import { PosCounterCheckoutPage } from './pages/pos/counter-checkout/pos-counter-checkout';
import { PosTableBookingPage } from './pages/pos/table-booking/pos-table-booking';
import { PosMenuStockPage } from './pages/pos/menu-stock/pos-menu-stock';

import { UiBootstrapPage } from './pages/ui/bootstrap/ui-bootstrap';
import { UiButtonsPage } from './pages/ui/buttons/ui-buttons';
import { UiCardPage } from './pages/ui/card/ui-card';
import { UiIconsPage } from './pages/ui/icons/ui-icons';
import { UiModalNotificationsPage } from './pages/ui/modal-notifications/ui-modal-notifications';
import { UiTypographyPage } from './pages/ui/typography/ui-typography';
import { UiTabsAccordionsPage } from './pages/ui/tabs-accordions/ui-tabs-accordions';

import { FormElementsPage } from './pages/form/elements/form-elements';
import { FormPluginsPage } from './pages/form/plugins/form-plugins';
import { FormWizardsPage } from './pages/form/wizards/form-wizards';

import { TableElementsPage } from './pages/table/elements/table-elements';
import { TablePluginsPage } from './pages/table/plugins/table-plugins';

import { ChartJsPage } from './pages/chart/js/chart-js';
import { ChartApexPage } from './pages/chart/apex/chart-apex';

import { MapPage } from './pages/map/map';

import { LayoutStarterPage } from './pages/layout/starter/layout-starter';
import { LayoutFixedFooterPage } from './pages/layout/fixed-footer/layout-fixed-footer';
import { LayoutFullHeightPage } from './pages/layout/full-height/layout-full-height';
import { LayoutFullWidthPage } from './pages/layout/full-width/layout-full-width';
import { LayoutBoxedLayoutPage } from './pages/layout/boxed-layout/layout-boxed-layout';
import { LayoutCollapsedSidebarPage } from './pages/layout/collapsed-sidebar/layout-collapsed-sidebar';
import { LayoutTopNavPage } from './pages/layout/top-nav/layout-top-nav';
import { LayoutMixedNavPage } from './pages/layout/mixed-nav/layout-mixed-nav';
import { LayoutMixedNavBoxedLayoutPage } from './pages/layout/mixed-nav-boxed-layout/layout-mixed-nav-boxed-layout';

import { ScrumBoardPage } from './pages/page/scrum-board/page-scrum-board';
import { ProductsPage } from './pages/page/products/page-products';
import { ProductDetailsPage } from './pages/page/product-details/page-product-details';
import { OrdersPage } from './pages/page/orders/page-orders';
import { OrderDetailsPage } from './pages/page/order-details/page-order-details';
import { GalleryPage } from './pages/page/gallery/page-gallery';
import { SearchResultsPage } from './pages/page/search-results/page-search-results';
import { ComingSoonPage } from './pages/page/coming-soon/page-coming-soon';
import { ErrorPage } from './pages/page/error/page-error';
import { LoginPage } from './pages/page/login/page-login';
import { RegisterPage } from './pages/page/register/page-register';
import { MessengerPage } from './pages/page/messenger/page-messenger';
import { DataManagementPage } from './pages/page/data-management/page-data-management';
import { FileManagerPage } from './pages/page/file-manager/page-file-manager';
import { PricingPage } from './pages/page/pricing/page-pricing';
import { LandingPage } from './pages/landing/landing';

import { ProfilePage } from './pages/profile/profile';
import { CalendarPage } from './pages/calendar/calendar';
import { SettingsPage } from './pages/settings/settings';
import { HelperPage } from './pages/helper/helper';

const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

    { path: 'dashboard', component: DashboardPage, data: { title: 'Dashboard' } },

    { path: 'iot/dashboard', component: IotDashboardPage, data: { title: 'IoT Dashboard' } },
    {
        path: 'iot/nodes',
        loadChildren: () => import('./pages/iot/nodes/nodes.module').then((m) => m.NodesModule)
    },
    { path: 'iot/alerts', component: IotAlertsPage, data: { title: 'IoT Alerts' } },
    {
        path: 'iot/projects',
        loadChildren: () => import('./pages/iot/projects/projects.module').then((m) => m.ProjectsModule)
    },
    {
        path: 'iot/config',
        loadChildren: () => import('./pages/iot/iot-config/iot-config-module').then((m) => m.IotConfigModule)
    },
    {
        path: 'iot/owners',
        loadChildren: () => import('./pages/iot/owners/owners.module').then((m) => m.OwnersModule)
    },
    {
        path: 'iot/telemetry',
        loadChildren: () => import('./pages/iot/telemetry/telemetry.module').then((m) => m.TelemetryModule)
    },
    { path: 'iot/widgets-showcase', component: WidgetsShowcasePage, data: { title: 'Widget Showcase' } },

    { path: 'analytics', component: AnalyticsPage, data: { title: 'Analytics' } },

    { path: 'email/inbox', component: EmailInboxPage, data: { title: 'Email Inbox' } },
    { path: 'email/compose', component: EmailComposePage, data: { title: 'Email Compose' } },
    { path: 'email/detail', component: EmailDetailPage, data: { title: 'Email Detail' } },

    { path: 'widgets', component: WidgetsPage, data: { title: 'Widgets' } },

    { path: 'ai/chat', component: AiChatPage, data: { title: 'AI Chat' } },
    { path: 'ai/image-generator', component: AiImageGeneratorPage, data: { title: 'AI Image Generator' } },

    { path: 'pos/customer-order', component: PosCustomerOrderPage, data: { title: 'Pos Customer Order' } },
    { path: 'pos/kitchen-order', component: PosKitchenOrderPage, data: { title: 'Pos Kitchen Order' } },
    { path: 'pos/counter-checkout', component: PosCounterCheckoutPage, data: { title: 'Pos Counter Checkout' } },
    { path: 'pos/table-booking', component: PosTableBookingPage, data: { title: 'Pos Table Booking' } },
    { path: 'pos/menu-stock', component: PosMenuStockPage, data: { title: 'Pos Menu Stock' } },

    { path: 'ui/bootstrap', component: UiBootstrapPage, data: { title: 'UI Bootstrap' } },
    { path: 'ui/buttons', component: UiButtonsPage, data: { title: 'UI Buttons' } },
    { path: 'ui/card', component: UiCardPage, data: { title: 'UI Card' } },
    { path: 'ui/icons', component: UiIconsPage, data: { title: 'UI Icons' } },
    { path: 'ui/modal-notifications', component: UiModalNotificationsPage, data: { title: 'UI Modal & Notifications' } },
    { path: 'ui/typography', component: UiTypographyPage, data: { title: 'UI Typography' } },
    { path: 'ui/tabs-accordions', component: UiTabsAccordionsPage, data: { title: 'UI Tabs & Accordions' } },

    { path: 'form/elements', component: FormElementsPage, data: { title: 'Form Elements' } },
    { path: 'form/plugins', component: FormPluginsPage, data: { title: 'Form Plugins' } },
    { path: 'form/wizards', component: FormWizardsPage, data: { title: 'Form Wizards' } },

    { path: 'table/elements', component: TableElementsPage, data: { title: 'Table Elements' } },
    { path: 'table/plugins', component: TablePluginsPage, data: { title: 'Table Plugins' } },

    { path: 'chart/js', component: ChartJsPage, data: { title: 'Chart JS' } },
    { path: 'chart/apex', component: ChartApexPage, data: { title: 'Chart Apex' } },

    { path: 'map', component: MapPage, data: { title: 'Map' } },

    { path: 'layout/starter', component: LayoutStarterPage, data: { title: 'Starter Page' } },
    { path: 'layout/fixed-footer', component: LayoutFixedFooterPage, data: { title: 'Fixed Footer Page' } },
    { path: 'layout/full-height', component: LayoutFullHeightPage, data: { title: 'Full Height Page' } },
    { path: 'layout/full-width', component: LayoutFullWidthPage, data: { title: 'Full Width Page' } },
    { path: 'layout/boxed-layout', component: LayoutBoxedLayoutPage, data: { title: 'Boxed Layout Page' } },
    { path: 'layout/collapsed-sidebar', component: LayoutCollapsedSidebarPage, data: { title: 'Collapsed Sidebar Page' } },
    { path: 'layout/top-nav', component: LayoutTopNavPage, data: { title: 'Top Nav Page' } },
    { path: 'layout/mixed-nav', component: LayoutMixedNavPage, data: { title: 'Mixed Nav Page' } },
    { path: 'layout/mixed-nav-boxed-layout', component: LayoutMixedNavBoxedLayoutPage, data: { title: 'Mixed Nav Boxed Layout Page' } },

    { path: 'page/scrum-board', component: ScrumBoardPage, data: { title: 'Scrum Board Page' } },
    { path: 'page/products', component: ProductsPage, data: { title: 'Products Page' } },
    { path: 'page/product-details', component: ProductDetailsPage, data: { title: 'Product Details Page' } },
    { path: 'page/orders', component: OrdersPage, data: { title: 'Orders Page' } },
    { path: 'page/order-details', component: OrderDetailsPage, data: { title: 'Order Details Page' } },
    { path: 'page/gallery', component: GalleryPage, data: { title: 'Gallery Page' } },
    { path: 'page/search-results', component: SearchResultsPage, data: { title: 'Search Results Page' } },
    { path: 'page/coming-soon', component: ComingSoonPage, data: { title: 'Coming Soon Page' } },
    { path: 'page/error', component: ErrorPage, data: { title: 'Error Page' } },
    { path: 'page/login', component: LoginPage, data: { title: 'Login Page' } },
    { path: 'page/register', component: RegisterPage, data: { title: 'Register Page' } },
    { path: 'page/messenger', component: MessengerPage, data: { title: 'Messenger Page' } },
    { path: 'page/data-management', component: DataManagementPage, data: { title: 'Data Management Page' } },
    { path: 'page/file-manager', component: FileManagerPage, data: { title: 'File Manager Page' } },
    { path: 'page/pricing', component: PricingPage, data: { title: 'Pricing Page' } },
    { path: 'landing', component: LandingPage, data: { title: 'Landing Page' } },

    { path: 'profile', component: ProfilePage, data: { title: 'Profile' } },
    { path: 'calendar', component: CalendarPage, data: { title: 'Calendar' } },
    { path: 'settings', component: SettingsPage, data: { title: 'Settings' } },
    { path: 'helper', component: HelperPage, data: { title: 'Helper' } },

    { path: '**', pathMatch: 'full', component: ErrorPage, data: { title: 'Error Page' } },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
    declarations: []
})


export class AppRoutingModule { }
