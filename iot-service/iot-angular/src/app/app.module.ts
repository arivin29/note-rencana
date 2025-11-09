// Core Module
import { Router, NavigationEnd, ActivatedRoute }   from '@angular/router';
import { CommonModule, JsonPipe }                  from '@angular/common';
import { HttpClientModule }                        from '@angular/common/http';
import { NgModule }                                from '@angular/core';
import { FormsModule, ReactiveFormsModule }        from '@angular/forms';
import { BrowserModule, Title }                    from '@angular/platform-browser';
import { BrowserAnimationsModule }                 from '@angular/platform-browser/animations';
import { AppRoutingModule }                        from './app-routing.module';


// Plugins
import { NgScrollbarModule, NG_SCROLLBAR_OPTIONS } from 'ngx-scrollbar';
import { provideHighlightOptions, HighlightAuto }  from 'ngx-highlightjs';
import { FullCalendarModule }                      from '@fullcalendar/angular';
import { NgxMasonryModule }                        from 'ngx-masonry';
import { NgbDatepickerModule, 
         NgbAlertModule,
         NgbTypeaheadModule,
         NgbTimepickerModule }                     from '@ng-bootstrap/ng-bootstrap';
import { ColorSketchModule }                       from 'ngx-color/sketch';
import { TagInputModule }                          from 'ngx-chips';
import { NgxMaskDirective, 
         NgxMaskPipe, 
         provideNgxMask }                          from 'ngx-mask';
import { QuillModule }                             from 'ngx-quill';
import { NgSelectModule }                          from '@ng-select/ng-select';
import { CountdownModule }                         from 'ngx-countdown';
import { NgChartsModule }                          from 'ng2-charts';
import { NgApexchartsModule }                      from 'ng-apexcharts';


// App Component
import { AppComponent }                    from './app.component';
import { HeaderComponent }                 from './components/header/header.component';
import { TopNavComponent }                 from './components/top-nav/top-nav.component';
import { SidebarComponent }                from './components/sidebar/sidebar.component';
import { SidebarMobileBackdropComponent }  from './components/sidebar-mobile-backdrop/sidebar-mobile-backdrop.component';
import { FooterComponent }                 from './components/footer/footer.component';
import { ThemePanelComponent }             from './components/theme-panel/theme-panel.component';
import { NavScrollComponent }              from './components/nav-scroll/nav-scroll.component';
import { CardComponent, 
         CardHeaderComponent, 
         CardBodyComponent, 
         CardFooterComponent, 
         CardImgOverlayComponent, 
         CardGroupComponent,
         CardExpandTogglerComponent }      from './components/card/card.component';

import { DashboardPage }                   from './pages/dashboard/dashboard';
import { IotDashboardPage }                from './pages/iot/dashboard/iot-dashboard';
import { IotNodesPage }                    from './pages/iot/nodes/iot-nodes';
import { IotNodeDetailPage }               from './pages/iot/node-detail/iot-node-detail';
import { IotAlertsPage }                   from './pages/iot/alerts/iot-alerts';
import { IotProjectsPage }                 from './pages/iot/projects/iot-projects';
import { IotTelemetryPage }                from './pages/iot/telemetry/iot-telemetry';

import { AnalyticsPage }                   from './pages/analytics/analytics';
         
import { EmailInboxPage }                  from './pages/email/inbox/email-inbox';
import { EmailComposePage }                from './pages/email/compose/email-compose';
import { EmailDetailPage }                 from './pages/email/detail/email-detail';

import { WidgetsPage }                     from './pages/widgets/widgets';

import { AiChatPage }                      from './pages/ai/chat/ai-chat';
import { AiImageGeneratorPage }            from './pages/ai/image-generator/ai-image-generator';

import { PosCustomerOrderPage }            from './pages/pos/customer-order/pos-customer-order';
import { PosKitchenOrderPage }             from './pages/pos/kitchen-order/pos-kitchen-order';
import { PosCounterCheckoutPage }          from './pages/pos/counter-checkout/pos-counter-checkout';
import { PosTableBookingPage }             from './pages/pos/table-booking/pos-table-booking';
import { PosMenuStockPage }                from './pages/pos/menu-stock/pos-menu-stock';

import { UiBootstrapPage }                 from './pages/ui/bootstrap/ui-bootstrap';
import { UiButtonsPage }                   from './pages/ui/buttons/ui-buttons';
import { UiCardPage }                      from './pages/ui/card/ui-card';
import { UiIconsPage }                     from './pages/ui/icons/ui-icons';
import { UiModalNotificationsPage }        from './pages/ui/modal-notifications/ui-modal-notifications';
import { UiTypographyPage }                from './pages/ui/typography/ui-typography';
import { UiTabsAccordionsPage }            from './pages/ui/tabs-accordions/ui-tabs-accordions';

import { FormElementsPage }                from './pages/form/elements/form-elements';
import { FormPluginsPage }                 from './pages/form/plugins/form-plugins';
import { FormWizardsPage }                 from './pages/form/wizards/form-wizards';

import { TableElementsPage }               from './pages/table/elements/table-elements';
import { TablePluginsPage }                from './pages/table/plugins/table-plugins';

import { ChartJsPage }                     from './pages/chart/js/chart-js';
import { ChartApexPage }                   from './pages/chart/apex/chart-apex';

import { MapPage }                         from './pages/map/map';

import { LayoutStarterPage }               from './pages/layout/starter/layout-starter';
import { LayoutFixedFooterPage }           from './pages/layout/fixed-footer/layout-fixed-footer';
import { LayoutFullHeightPage }            from './pages/layout/full-height/layout-full-height';
import { LayoutFullWidthPage }             from './pages/layout/full-width/layout-full-width';
import { LayoutBoxedLayoutPage }           from './pages/layout/boxed-layout/layout-boxed-layout';
import { LayoutCollapsedSidebarPage }      from './pages/layout/collapsed-sidebar/layout-collapsed-sidebar';
import { LayoutTopNavPage }                from './pages/layout/top-nav/layout-top-nav';
import { LayoutMixedNavPage }              from './pages/layout/mixed-nav/layout-mixed-nav';
import { LayoutMixedNavBoxedLayoutPage }   from './pages/layout/mixed-nav-boxed-layout/layout-mixed-nav-boxed-layout';

import { ScrumBoardPage }                  from './pages/page/scrum-board/page-scrum-board';
import { ProductsPage }                    from './pages/page/products/page-products';
import { ProductDetailsPage }              from './pages/page/product-details/page-product-details';
import { OrdersPage }                      from './pages/page/orders/page-orders';
import { OrderDetailsPage }                from './pages/page/order-details/page-order-details';
import { GalleryPage }                     from './pages/page/gallery/page-gallery';
import { SearchResultsPage }               from './pages/page/search-results/page-search-results';
import { ComingSoonPage }                  from './pages/page/coming-soon/page-coming-soon';
import { ErrorPage }                       from './pages/page/error/page-error';
import { LoginPage }                       from './pages/page/login/page-login';
import { RegisterPage }                    from './pages/page/register/page-register';
import { MessengerPage }                   from './pages/page/messenger/page-messenger';
import { DataManagementPage }              from './pages/page/data-management/page-data-management';
import { FileManagerPage }                 from './pages/page/file-manager/page-file-manager';
import { PricingPage }                     from './pages/page/pricing/page-pricing';
import { LandingPage }                     from './pages/landing/landing';

import { ProfilePage }                     from './pages/profile/profile';
import { CalendarPage }                    from './pages/calendar/calendar';
import { SettingsPage }                    from './pages/settings/settings';
import { HelperPage }                      from './pages/helper/helper';


@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    TopNavComponent,
    SidebarComponent,
    SidebarMobileBackdropComponent,
    FooterComponent,
    ThemePanelComponent,
    NavScrollComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    CardFooterComponent,
    CardImgOverlayComponent,
    CardGroupComponent,
    CardExpandTogglerComponent,
    
    DashboardPage,
    IotDashboardPage,
    IotNodesPage,
    IotNodeDetailPage,
    IotAlertsPage,
    IotProjectsPage,
    IotTelemetryPage,
    
    AnalyticsPage,
    
    EmailInboxPage,
    EmailComposePage,
    EmailDetailPage,
    
    WidgetsPage,
    
    AiChatPage,
    AiImageGeneratorPage,
    
    PosCustomerOrderPage,
    PosKitchenOrderPage,
    PosCounterCheckoutPage,
    PosTableBookingPage,
    PosMenuStockPage,
    
    UiBootstrapPage,
    UiButtonsPage,
    UiCardPage,
    UiIconsPage,
    UiModalNotificationsPage,
    UiTypographyPage,
    UiTabsAccordionsPage,
    
    FormElementsPage,
    FormPluginsPage,
    FormWizardsPage,
    
    TableElementsPage,
    TablePluginsPage,
    
    ChartJsPage,
    ChartApexPage,
    
    MapPage,
    
    LayoutStarterPage,
    LayoutFixedFooterPage,
    LayoutFullHeightPage,
    LayoutFullWidthPage,
    LayoutBoxedLayoutPage,
    LayoutCollapsedSidebarPage,
    LayoutTopNavPage,
    LayoutMixedNavPage,
    LayoutMixedNavBoxedLayoutPage,
    
    ScrumBoardPage,
		ProductsPage,
		ProductDetailsPage,
		OrdersPage,
		OrderDetailsPage,
		GalleryPage,
		SearchResultsPage,
		ComingSoonPage,
		ErrorPage,
		LoginPage,
		RegisterPage,
		MessengerPage,
		DataManagementPage,
		FileManagerPage,
		PricingPage,
		LandingPage,
    
    ProfilePage,
    CalendarPage,
    SettingsPage,
    HelperPage
  ],
  imports: [
  	CommonModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
  	HttpClientModule,
  	JsonPipe,
  	
  	NgChartsModule,
    NgScrollbarModule,
  	NgxMasonryModule,
  	NgbDatepickerModule,
  	NgbTimepickerModule,
  	NgbTypeaheadModule,
  	NgxMaskDirective, 
  	NgxMaskPipe,
  	NgSelectModule,
  	NgApexchartsModule,
    HighlightAuto,
  	FullCalendarModule,
  	ColorSketchModule,
  	CountdownModule,
  	TagInputModule,
  	QuillModule.forRoot()
  ],
  providers: [Title, 
  	provideNgxMask(),
  	provideHighlightOptions({
      fullLibraryLoader: () => import('highlight.js'),
      lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),
    }),
  	{ 
			provide: NG_SCROLLBAR_OPTIONS,
			useValue: {
				visibility: 'hover'
			}
		}
	],
  bootstrap: [ AppComponent ]
})

export class AppModule {
	title: string = 'HUD';
	
  constructor(private router: Router, private titleService: Title, private route: ActivatedRoute) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
      	if (this.route.snapshot.firstChild && this.route.snapshot.firstChild.data['title']) {
      		this.title = 'HUD | '+ this.route.snapshot.firstChild.data['title'];
      	}
        this.titleService.setTitle(this.title);
        
        var elm = document.getElementById('app');
				if (elm) {
					elm.classList.remove('app-sidebar-toggled');
					elm.classList.remove('app-sidebar-mobile-toggled');
				}
      }
    });
  }
}
