import { Component, OnInit } from '@angular/core';
import { SensorContextService } from 'src/sdk/core/services/sensor-context.service';

interface Profile {
  idProfile: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

@Component({
  selector: 'app-installation-profiles',
  templateUrl: './installation-profiles.html',
  styleUrls: ['./installation-profiles.scss'],
  standalone: false
})
export class InstallationProfilesPage implements OnInit {
  profiles: Profile[] = [];
  loading = false;
  error: string | null = null;

  drawerOpen = false;
  activeProfile: Profile | null = null;

  constructor(private svc: SensorContextService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = null;
    this.svc.profilesList$Response().subscribe({
      next: (r) => { this.profiles = (this.body(r.body) || []) as Profile[]; this.loading = false; },
      error: (e) => { this.error = e?.error?.message || e?.message || 'Failed to load profiles'; this.loading = false; }
    });
  }

  iconFor(code: string): string {
    switch (code) {
      case 'PIPA': return 'bi bi-pipe';
      case 'TANDON': return 'bi bi-droplet-half';
      case 'ELEKTRIK': return 'bi bi-lightning-charge';
      case 'KUALITAS': return 'bi bi-eyedropper';
      default: return 'bi bi-sliders';
    }
  }

  openFields(p: Profile): void { this.activeProfile = p; this.drawerOpen = true; }
  closeDrawer(): void { this.drawerOpen = false; this.activeProfile = null; }

  private body(b: any): any {
    if (typeof b === 'string') { try { return JSON.parse(b); } catch { return null; } }
    return b;
  }
}
