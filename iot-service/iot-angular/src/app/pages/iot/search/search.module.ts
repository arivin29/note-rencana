import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SharedComponentsModule } from '../../../shared/shared-components.module';
import { SearchRoutingModule } from './search-routing.module';
import { SearchPage } from './search-page/search-page';

@NgModule({
  declarations: [SearchPage],
  imports: [
    CommonModule,
    FormsModule,
    SharedComponentsModule,
    SearchRoutingModule,
  ],
})
export class SearchModule {}
