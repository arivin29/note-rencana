import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedComponentsModule } from '../../shared/shared-components.module';
import { AuthGuard } from '../../services/auth.guard';
import { DeveloperPortalComponent } from './developer-portal.component';

const routes: Routes = [
    {
        path: '',
        component: DeveloperPortalComponent,
        canActivate: [AuthGuard],
        data: { title: 'Developer Portal' }
    }
];

@NgModule({
    declarations: [DeveloperPortalComponent],
    imports: [
        CommonModule,
        FormsModule,
        SharedComponentsModule,
        RouterModule.forChild(routes)
    ]
})
export class DeveloperModule {}
