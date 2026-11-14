import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';
import { MobileProjectStore } from '../../shared/mobile-project-store.service';
import { mErrorText } from '../../shared/labels';
import { NodeModelCommandsService } from '@sdk/core/services/node-model-commands.service';
import { NodeCommandService } from '@sdk/core/services/node-command.service';

/** Segmen Perintah: daftar command dinamis (node_model_commands) SMS/MQTT, isi param + konfirmasi + kirim. */
@Component({
  selector: 'mobile-node-command',
  templateUrl: './mobile-node-command.component.html',
  standalone: false
})
export class MobileNodeCommandComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  commands: any[] = [];

  nodeUuid = '';
  serial = '';          // node.code → {serial}
  idNodeModel = '';
  picPhone = '';

  // sheet command aktif
  sheetOpen = false;
  active: any = null;
  paramValues: Record<string, string> = {};
  destination = '';
  confirmed = false;
  sending = false;
  result = '';
  resultOk = false;

  private destroy$ = new Subject<void>();

  constructor(
    private store: MobileProjectStore,
    private cmdModelSvc: NodeModelCommandsService,
    private cmdSvc: NodeCommandService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Node dari store project (sudah dimuat shell) — tidak ada GET /nodes/{id} ulang per tab.
    const nid = this.route.parent?.snapshot.paramMap.get('nid') || '';
    this.store.state$.pipe(
      map((s) => ({ s, node: (s.nodes || []).find((n) => n.idNode === nid || n.code === nid) || null })),
      filter(({ s, node }) => !!node || !s.firstLoad),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(({ s, node }) => {
      if (!node) { this.error = s.nodesError || 'Perangkat tidak ditemukan'; this.loading = false; return; }
      this.nodeUuid = node.idNode;
      this.serial = node.code || this.nodeUuid;
      this.picPhone = node.picPhone || '';
      this.idNodeModel = node.idNodeModel || node.nodeModel?.idNodeModel || '';
      if (this.idNodeModel) { this.loadCommands(); } else { this.error = 'Model perangkat tidak diketahui'; this.loading = false; }
    });
  }

  loadCommands(): void {
    this.loading = true; this.error = '';
    this.cmdModelSvc.nodeModelCommandsControllerFindByNodeModel$Response({ idNodeModel: this.idNodeModel })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          let b: any = res.body; if (typeof b === 'string') { b = JSON.parse(b); }
          const list = (Array.isArray(b) ? b : (b?.data || [])) as any[];
          this.commands = list.filter((c) => c.isActive !== false).sort((a, b2) => (a.sortOrder || 0) - (b2.sortOrder || 0));
          this.loading = false;
        },
        error: (e) => { this.error = mErrorText(e, 'daftar perintah'); this.loading = false; }
      });
  }

  tint(c: string): string {
    switch ((c || '').toLowerCase()) {
      case 'primary': return 'var(--m-aqua)';
      case 'info': return 'var(--m-info)';
      case 'warning': return 'var(--m-warning)';
      case 'danger': return 'var(--m-danger)';
      default: return 'var(--m-text-muted)';
    }
  }

  get activeParams(): any[] { return this.active?.config?.params || []; }
  get activeDanger(): boolean { return !!(this.active?.config?.danger || this.active?.config?.requireConfirm); }
  get preview(): string { return this.active ? this.render(this.active, this.paramValues) : ''; }

  open(cmd: any): void {
    this.active = cmd;
    this.paramValues = {};
    for (const p of (cmd.config?.params || [])) { this.paramValues[p.key] = p.default || ''; }
    this.destination = this.picPhone || '';
    this.confirmed = false;
    this.result = '';
    this.sheetOpen = true;
  }
  close(): void { this.sheetOpen = false; this.active = null; }

  private render(cmd: any, params: Record<string, string>): string {
    let t = (cmd.template || '')
      .replace(/\{device_id\}/g, this.nodeUuid)
      .replace(/\{serial\}/g, this.serial)
      .replace(/\{cmd\}/g, cmd.code || '');
    for (const [k, v] of Object.entries(params || {})) {
      t = t.replace(new RegExp('\\{\\{\\s*' + k + '\\s*\\}\\}', 'g'), (v ?? '').trim());
    }
    t = t.replace(/\{\{[^}]*\}\}/g, '');
    const prefix = (t.match(/^(\s*)/) || ['', ''])[1];
    return prefix + t.slice(prefix.length).replace(/\s+/g, ' ').trimEnd();
  }

  send(): void {
    const cmd = this.active;
    if (!cmd) { return; }
    if (this.activeDanger && !this.confirmed) { window.alert('Centang konfirmasi dulu untuk command ini.'); return; }
    const channel = (cmd.channel || '').toLowerCase();
    const text = this.preview;

    // SMS: buka aplikasi SMS HP terisi (user yang menekan kirim)
    if (channel === 'sms') {
      if (this.destination) { window.open(`sms:${this.destination}?body=${encodeURIComponent(text)}`, '_blank'); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(text); }
    }

    this.sending = true; this.result = '';
    const body = {
      idCommand: cmd.idCommand, code: cmd.code, label: cmd.label, channel,
      renderedText: text, destination: this.destination, params: this.paramValues,
      isRelay: !!cmd.isRelay, hasReturn: !!cmd.hasReturn
    };
    this.cmdSvc.commandSend$Response({ id: this.nodeUuid, body }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.sending = false; this.resultOk = true; this.result = channel === 'sms' ? 'SMS disiapkan & dicatat' : 'Perintah terkirim'; this.sheetOpen = false; },
      error: (e) => { this.sending = false; this.resultOk = false; this.result = 'Gagal: ' + (e?.error?.message || e?.message || 'Error'); }
    });
  }

  copy(): void { if (navigator.clipboard) { navigator.clipboard.writeText(this.preview); } }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
