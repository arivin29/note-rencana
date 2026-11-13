import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScadaEmbedComponent } from './scada-embed.component';

/**
 * `<app-scada-embed>` — iframe + auth handshake for the iot-scada app. Imported by ProjectsModule
 * (SCADA tab), MobileModule (SCADA tab) and WidgetBuilderModule (`scada` widget). Don't copy the
 * iframe/postMessage code elsewhere — use this component.
 */
@NgModule({
  declarations: [ScadaEmbedComponent],
  imports: [CommonModule],
  exports: [ScadaEmbedComponent],
})
export class ScadaEmbedModule {}
