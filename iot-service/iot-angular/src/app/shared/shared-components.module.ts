import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent, CardHeaderComponent, CardBodyComponent, CardFooterComponent, CardImgOverlayComponent, CardGroupComponent, CardExpandTogglerComponent } from '../components/card/card.component';
import { NavScrollComponent } from '../components/nav-scroll/nav-scroll.component';
import { NgbDatepickerModule, NgbTimepickerModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgChartsModule } from 'ng2-charts';
import { HighlightAuto } from 'ngx-highlightjs';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { NgxMasonryModule } from 'ngx-masonry';
import { NgScrollbarModule } from 'ngx-scrollbar';


@NgModule({
    declarations: [
        CardComponent,
        CardHeaderComponent,
        CardBodyComponent,
        CardFooterComponent,
        CardImgOverlayComponent,
        CardGroupComponent,
        CardExpandTogglerComponent,
        NavScrollComponent
    ],
    imports: [
        CommonModule,
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
    ],
    exports: [
        CardComponent,
        CardHeaderComponent,
        CardBodyComponent,
        CardFooterComponent,
        CardImgOverlayComponent,
        CardGroupComponent,
        CardExpandTogglerComponent,
        NavScrollComponent
    ]
})
export class SharedComponentsModule { }
