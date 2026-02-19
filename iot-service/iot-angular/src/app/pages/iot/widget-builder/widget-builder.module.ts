import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Shared Components
import { SharedComponentsModule } from '../../../shared/shared-components.module';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

// Third-party
import { GridsterModule } from 'angular-gridster2';
import { NgxEchartsModule } from 'ngx-echarts';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { NgSelectModule } from '@ng-select/ng-select';

// Components
import { DashboardListComponent } from './dashboard-list/dashboard-list.component';
import { DashboardViewComponent } from './dashboard-view/dashboard-view.component';
import { WidgetWizardComponent } from './widget-wizard/widget-wizard.component';
import { WidgetContainerComponent } from './components/widget-container/widget-container.component';
import { LineChartWidgetComponent } from './components/widgets/line-chart-widget.component';
import { BarChartWidgetComponent } from './components/widgets/bar-chart-widget.component';
import { GaugeWidgetComponent } from './components/widgets/gauge-widget.component';
import { PieChartWidgetComponent } from './components/widgets/pie-chart-widget.component';
import { ValueCardWidgetComponent } from './components/widgets/value-card-widget.component';
import { DataTableWidgetComponent } from './components/widgets/data-table-widget.component';
import { TimeRangePickerComponent } from './components/time-range-picker/time-range-picker.component';
import { SqlEditorComponent } from './components/sql-editor/sql-editor.component';
import { FieldMappingComponent } from './components/field-mapping/field-mapping.component';
import { DashboardModalComponent } from './components/dashboard-modal/dashboard-modal.component';

// Template System Components
import { WidgetCreateComponent } from './widget-create/widget-create.component';
import { WidgetTemplateWizardComponent } from './widget-template-wizard/widget-template-wizard.component';

const routes: Routes = [
  { path: '', component: DashboardListComponent },
  { path: ':id', component: DashboardViewComponent },
  { path: ':id/widget/new', component: WidgetCreateComponent },
  { path: ':id/widget/template', component: WidgetTemplateWizardComponent },
  { path: ':id/add-widget', component: WidgetWizardComponent },
  { path: ':id/edit-widget/:widgetId', component: WidgetWizardComponent },
];

@NgModule({
  declarations: [
    DashboardListComponent,
    DashboardViewComponent,
    WidgetWizardComponent,
    WidgetContainerComponent,
    LineChartWidgetComponent,
    BarChartWidgetComponent,
    GaugeWidgetComponent,
    PieChartWidgetComponent,
    ValueCardWidgetComponent,
    DataTableWidgetComponent,
    TimeRangePickerComponent,
    SqlEditorComponent,
    FieldMappingComponent,
    DashboardModalComponent,
    // Template System
    WidgetCreateComponent,
    WidgetTemplateWizardComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    
    // Angular Material
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatStepperModule,
    MatCardModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatDividerModule,
    
    // Third-party
    GridsterModule,
    NgxEchartsModule.forChild(),
    CodemirrorModule,
    NgSelectModule,
    
    // Shared Components (Card, etc.)
    SharedComponentsModule,
  ],
})
export class WidgetBuilderModule {}
