import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import * as TemplatePages from './template-components';

const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

    { path: 'dashboard', component: TemplatePages.DashboardPage, data: { title: 'Dashboard' } },
    { path: 'analytics', component: TemplatePages.AnalyticsPage, data: { title: 'Analytics' } },

    { path: 'email/inbox', component: TemplatePages.EmailInboxPage, data: { title: 'Email Inbox' } },
    { path: 'email/compose', component: TemplatePages.EmailComposePage, data: { title: 'Email Compose' } },
    { path: 'email/detail', component: TemplatePages.EmailDetailPage, data: { title: 'Email Detail' } },

    { path: 'widgets', component: TemplatePages.WidgetsPage, data: { title: 'Widgets' } },

    { path: 'ai/chat', component: TemplatePages.AiChatPage, data: { title: 'AI Chat' } },
    { path: 'ai/image-generator', component: TemplatePages.AiImageGeneratorPage, data: { title: 'AI Image Generator' } },

    { path: 'pos/customer-order', component: TemplatePages.PosCustomerOrderPage, data: { title: 'Pos Customer Order' } },
    { path: 'pos/kitchen-order', component: TemplatePages.PosKitchenOrderPage, data: { title: 'Pos Kitchen Order' } },
    { path: 'pos/counter-checkout', component: TemplatePages.PosCounterCheckoutPage, data: { title: 'Pos Counter Checkout' } },
    { path: 'pos/table-booking', component: TemplatePages.PosTableBookingPage, data: { title: 'Pos Table Booking' } },
    { path: 'pos/menu-stock', component: TemplatePages.PosMenuStockPage, data: { title: 'Pos Menu Stock' } },

    { path: 'ui/bootstrap', component: TemplatePages.UiBootstrapPage, data: { title: 'UI Bootstrap' } },
    { path: 'ui/buttons', component: TemplatePages.UiButtonsPage, data: { title: 'UI Buttons' } },
    { path: 'ui/card', component: TemplatePages.UiCardPage, data: { title: 'UI Card' } },
    { path: 'ui/icons', component: TemplatePages.UiIconsPage, data: { title: 'UI Icons' } },
    { path: 'ui/modal-notifications', component: TemplatePages.UiModalNotificationsPage, data: { title: 'UI Modal & Notifications' } },
    { path: 'ui/typography', component: TemplatePages.UiTypographyPage, data: { title: 'UI Typography' } },
    { path: 'ui/tabs-accordions', component: TemplatePages.UiTabsAccordionsPage, data: { title: 'UI Tabs & Accordions' } },

    { path: 'form/elements', component: TemplatePages.FormElementsPage, data: { title: 'Form Elements' } },
    { path: 'form/plugins', component: TemplatePages.FormPluginsPage, data: { title: 'Form Plugins' } },
    { path: 'form/wizards', component: TemplatePages.FormWizardsPage, data: { title: 'Form Wizards' } },

    { path: 'table/elements', component: TemplatePages.TableElementsPage, data: { title: 'Table Elements' } },
    { path: 'table/plugins', component: TemplatePages.TablePluginsPage, data: { title: 'Table Plugins' } },

    { path: 'chart/js', component: TemplatePages.ChartJsPage, data: { title: 'Chart JS' } },
    { path: 'chart/apex', component: TemplatePages.ChartApexPage, data: { title: 'Chart Apex' } },

    { path: 'map', component: TemplatePages.MapPage, data: { title: 'Map' } },

    { path: 'layout/starter', component: TemplatePages.LayoutStarterPage, data: { title: 'Starter Page' } },
    { path: 'layout/fixed-footer', component: TemplatePages.LayoutFixedFooterPage, data: { title: 'Fixed Footer Page' } },
    { path: 'layout/full-height', component: TemplatePages.LayoutFullHeightPage, data: { title: 'Full Height Page' } },
    { path: 'layout/full-width', component: TemplatePages.LayoutFullWidthPage, data: { title: 'Full Width Page' } },
    { path: 'layout/boxed-layout', component: TemplatePages.LayoutBoxedLayoutPage, data: { title: 'Boxed Layout Page' } },
    { path: 'layout/collapsed-sidebar', component: TemplatePages.LayoutCollapsedSidebarPage, data: { title: 'Collapsed Sidebar Page' } },
    { path: 'layout/top-nav', component: TemplatePages.LayoutTopNavPage, data: { title: 'Top Nav Page' } },
    { path: 'layout/mixed-nav', component: TemplatePages.LayoutMixedNavPage, data: { title: 'Mixed Nav Page' } },
    { path: 'layout/mixed-nav-boxed-layout', component: TemplatePages.LayoutMixedNavBoxedLayoutPage, data: { title: 'Mixed Nav Boxed Layout Page' } },

    { path: 'page/scrum-board', component: TemplatePages.ScrumBoardPage, data: { title: 'Scrum Board Page' } },
    { path: 'page/products', component: TemplatePages.ProductsPage, data: { title: 'Products Page' } },
    { path: 'page/product-details', component: TemplatePages.ProductDetailsPage, data: { title: 'Product Details Page' } },
    { path: 'page/orders', component: TemplatePages.OrdersPage, data: { title: 'Orders Page' } },
    { path: 'page/order-details', component: TemplatePages.OrderDetailsPage, data: { title: 'Order Details Page' } },
    { path: 'page/gallery', component: TemplatePages.GalleryPage, data: { title: 'Gallery Page' } },
    { path: 'page/search-results', component: TemplatePages.SearchResultsPage, data: { title: 'Search Results Page' } },
    { path: 'page/coming-soon', component: TemplatePages.ComingSoonPage, data: { title: 'Coming Soon Page' } },
    { path: 'page/error', component: TemplatePages.ErrorPage, data: { title: 'Error Page' } },
    { path: 'page/login', component: TemplatePages.LoginPage, data: { title: 'Login Page' } },
    { path: 'page/register', component: TemplatePages.RegisterPage, data: { title: 'Register Page' } },
    { path: 'page/messenger', component: TemplatePages.MessengerPage, data: { title: 'Messenger Page' } },
    { path: 'page/data-management', component: TemplatePages.DataManagementPage, data: { title: 'Data Management Page' } },
    { path: 'page/file-manager', component: TemplatePages.FileManagerPage, data: { title: 'File Manager Page' } },
    { path: 'page/pricing', component: TemplatePages.PricingPage, data: { title: 'Pricing Page' } },

    { path: 'landing', component: TemplatePages.LandingPage, data: { title: 'Landing Page' } },

    { path: 'profile', component: TemplatePages.ProfilePage, data: { title: 'Profile' } },
    { path: 'calendar', component: TemplatePages.CalendarPage, data: { title: 'Calendar' } },
    { path: 'settings', component: TemplatePages.SettingsPage, data: { title: 'Settings' } },
    { path: 'helper', component: TemplatePages.HelperPage, data: { title: 'Helper' } },
    { path: 'owner-test', component: TemplatePages.OwnerTestComponent, data: { title: 'Owner API Test' } },

    { path: '**', component: TemplatePages.ErrorPage, data: { title: 'Error Page' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TemplateRoutingModule { }
