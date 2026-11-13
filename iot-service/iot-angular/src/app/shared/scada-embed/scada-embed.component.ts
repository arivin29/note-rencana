import {
  Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScadaService } from '@services/scada.service';
import { AuthService } from '@services/auth.service';
import { environment } from 'src/environments/environment';
import { appendScadaParams, ScadaEmbedParams, scadaOrigin } from './scada-embed-url';

/**
 * The ONE place that embeds the iot-scada app (desktop SCADA tab, mobile SCADA tab, Widget Builder
 * `scada` widget). Handles the sanitized iframe URL and the auth handshake:
 *  - on iframe `load` → post `{type:'scada-auth', token}` (target origin = environment.scadaUrl);
 *  - on `scada-ready` from the child (its listener is attached; the load-time send can be lost,
 *    notably on mobile Chrome) → ALWAYS re-send the token.
 * Messages are accepted only from the SCADA origin AND from this component's own iframe (several
 * embeds may live on one dashboard). Other messages from the child are re-emitted as `childMessage`
 * (e.g. mobile `scada-fullscreen`).
 * The iframe only reloads when the computed URL changes (projectId / diagramId / mode / params).
 * Size: the host is a flex column, the iframe fills it — give the host a size (height / flex:1).
 */
@Component({
  selector: 'app-scada-embed',
  template: `
    <iframe *ngIf="url" #scadaIframe class="scada-embed-frame" [src]="url" [title]="title"
      (load)="onIframeLoad()" allow="fullscreen" frameborder="0"></iframe>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; }
    .scada-embed-frame {
      flex: 1 1 auto; width: 100%; height: 100%; min-height: 0; border: 0; display: block;
      background: var(--scada-embed-bg, #0d1117);
    }
  `],
  standalone: false,
})
export class ScadaEmbedComponent implements OnInit, OnChanges, OnDestroy {
  @Input() projectId: string | null = null;
  @Input() diagramId: string | null = null;
  @Input() mode: 'view' | 'edit' = 'view';
  /** Extra query params (e.g. kiosk/interactive/theme). null/'' values are dropped. */
  @Input() params: ScadaEmbedParams | null = null;
  @Input() title = 'Bagan SCADA';
  /** Non-auth messages posted by this iframe (already origin/source checked). */
  @Output() childMessage = new EventEmitter<any>();

  @ViewChild('scadaIframe') scadaIframe?: ElementRef<HTMLIFrameElement>;

  url: SafeResourceUrl | null = null;
  private rawUrl = '';
  private tokenSent = false;
  private readonly origin = scadaOrigin(environment.scadaUrl);

  private readonly onMessage = (event: MessageEvent) => {
    if (!this.origin || event.origin !== this.origin) return;
    const own = this.scadaIframe?.nativeElement?.contentWindow;
    if (!own || event.source !== own) return;
    const type = event.data?.type;
    if (type === 'scada-ready') {
      this.sendToken(true);
    } else if (type && type !== 'scada-auth') {
      this.childMessage.emit(event.data);
    }
  };

  constructor(
    private sanitizer: DomSanitizer,
    private scadaService: ScadaService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    window.addEventListener('message', this.onMessage);
  }

  ngOnChanges(): void {
    const raw = this.projectId && this.diagramId
      ? appendScadaParams(this.scadaService.getEmbedUrl(this.projectId, this.diagramId, this.mode), this.params)
      : '';
    if (raw === this.rawUrl) return;          // same URL → never reload the iframe
    this.rawUrl = raw;
    this.tokenSent = false;
    this.url = raw ? this.sanitizer.bypassSecurityTrustResourceUrl(raw) : null;
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.url = null;
  }

  onIframeLoad(): void {
    this.sendToken();
  }

  private sendToken(force = false): void {
    if (this.tokenSent && !force) return;
    const token = this.authService.getAccessToken();
    const win = this.scadaIframe?.nativeElement?.contentWindow;
    if (token && win) {
      win.postMessage({ type: 'scada-auth', token }, environment.scadaUrl);
      this.tokenSent = true;
    }
  }
}
