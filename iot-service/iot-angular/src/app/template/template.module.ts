import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { NgScrollbarModule } from 'ngx-scrollbar';
import { HighlightAuto } from 'ngx-highlightjs';
import { FullCalendarModule } from '@fullcalendar/angular';
import { NgxMasonryModule } from 'ngx-masonry';
import {
    NgbDatepickerModule,
    NgbAlertModule,
    NgbTypeaheadModule,
    NgbTimepickerModule
} from '@ng-bootstrap/ng-bootstrap';
import { ColorSketchModule } from 'ngx-color/sketch';
import { TagInputModule } from 'ngx-chips';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { QuillModule } from 'ngx-quill';
import { NgSelectModule } from '@ng-select/ng-select';
import { CountdownModule } from 'ngx-countdown';
import { NgChartsModule } from 'ng2-charts';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedComponentsModule } from '../shared/shared-components.module';
import { WidgetsModule } from '../components/widgets/widgets-module';

import { TemplateRoutingModule } from './template-routing.module';
import { TEMPLATE_COMPONENTS } from './template-components';

@NgModule({
    declarations: [...TEMPLATE_COMPONENTS],
    imports: [
        CommonModule,
        FormsModule, 
        ReactiveFormsModule,
        HttpClientModule,
        SharedComponentsModule,
        WidgetsModule,
        TemplateRoutingModule,

        NgChartsModule,
        NgScrollbarModule,
        NgxMasonryModule,
        NgbDatepickerModule,
        NgbAlertModule,
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
        QuillModule.forChild()
    ]
})
export class TemplateModule { }
