import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AiNrwService } from '../../../../services/ai-nrw.service';

/**
 * Channel Hub — semua tentang SATU sensor channel di satu tempat (dok 08 gabungan).
 * Tab: Ringkasan (papan A1–A10) · Chart · Events · Settings. Tiap tab dirender lazy
 * (*ngIf) agar datanya selalu segar saat dibuka (mis. sehabis ubah Settings).
 */
@Component({
  selector: 'ai-channel-hub',
  templateUrl: './channel-hub.html',
  styleUrls: ['./channel-hub.scss'],
  standalone: false,
})
export class ChannelHubPage implements OnInit {
  targetId: string | null = null;
  channelName: string | null = null;
  groupName: string | null = null;
  aiEnabled = false;
  learnReady = false;
  activeTab: 'overview' | 'chart' | 'events' | 'settings' = 'overview';

  tabs: Array<{ key: 'overview' | 'chart' | 'events' | 'settings'; label: string; icon: string }> = [
    { key: 'overview', label: 'Ringkasan', icon: 'fa-table-list' },
    { key: 'chart', label: 'Chart', icon: 'fa-chart-line' },
    { key: 'events', label: 'Events', icon: 'fa-bell' },
    { key: 'settings', label: 'Settings', icon: 'fa-sliders' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ai: AiNrwService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.targetId = p.get('targetId');
      if (this.targetId) this.loadMeta();
    });
  }

  loadMeta(): void {
    this.ai.getConfig(this.targetId!).subscribe({
      next: (d) => {
        this.channelName = d.channelName;
        this.groupName = d.groupName;
        this.aiEnabled = d.aiEnabled;
        this.learnReady = d.learnReady;
      },
      error: () => {
        // channel belum punya config → nama menyusul; header tetap tampil
        this.channelName = this.channelName || null;
      },
    });
  }

  back(): void {
    this.router.navigate(['/iot/ai']);
  }
}
