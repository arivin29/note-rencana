import { Component, Input, NgZone, OnChanges, OnDestroy } from '@angular/core';
import { Widget } from '../../../models/widget.models';
import {
  readScadaOptions, scadaEmbedParams, scadaWidgetState, ScadaWidgetOptions, ScadaWidgetState,
} from '../../../utils/scada-options';
import { ScadaEmbedParams } from '../../../../../../shared/scada-embed/scada-embed-url';

/**
 * "Bagan SCADA" widget — embeds an existing iot-scada diagram via the shared `<app-scada-embed>`
 * (no copy of the iframe/auth code). Runs no SQL; the SCADA app polls its own runtime (5 s), so this
 * widget ignores dashboard refresh ticks and data changes — the iframe reloads only when projectId /
 * diagramId / options (or, for theme `auto`, the app theme) change the embed URL.
 * `blockPointer` (dashboard edit mode) lays a transparent shield over the iframe so gridster
 * drag/resize isn't swallowed by the iframe.
 */
@Component({
  selector: 'app-scada-widget',
  templateUrl: './scada-widget.component.html',
  styleUrls: ['./scada-widget.component.css'],
  standalone: false,
})
export class ScadaWidgetComponent implements OnChanges, OnDestroy {
  @Input() widget: Widget | undefined;
  @Input() projectId: string | null = null;
  @Input() blockPointer = false;

  options: ScadaWidgetOptions = readScadaOptions(null);
  state: ScadaWidgetState = 'no-project';
  params: ScadaEmbedParams | null = null;

  private paramsKey = '';
  private themeObserver: MutationObserver | null = null;

  constructor(private ngZone: NgZone) {}

  ngOnChanges(): void {
    this.options = readScadaOptions((this.widget?.config as any)?.display?.scadaOptions);
    this.state = scadaWidgetState(this.projectId, this.options);
    this.updateParams();
    this.syncThemeObserver();
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.themeObserver = null;
  }

  /** New params object only when a value changes (the embed reloads on URL change only anyway). */
  private updateParams(): void {
    const next = scadaEmbedParams(this.options, document.documentElement.getAttribute('data-bs-theme'));
    const key = JSON.stringify(next);
    if (key !== this.paramsKey) {
      this.paramsKey = key;
      this.params = next;
    }
  }

  private syncThemeObserver(): void {
    const follow = this.options.theme === 'auto';
    if (follow && !this.themeObserver) {
      this.themeObserver = new MutationObserver(() => this.ngZone.run(() => this.updateParams()));
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
    } else if (!follow && this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
  }
}
