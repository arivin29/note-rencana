import { Component, Input, OnInit } from '@angular/core';
import { DashboardService } from '@sdk/core/services/dashboard.service';
import { ReleaseScheduleResponseDto } from '@sdk/core/models/release-schedule-response-dto';

@Component({
  selector: 'dashboard-release-window',
  templateUrl: './release-window.component.html',
  styleUrls: ['./release-window.component.scss'],
  standalone: false
})
export class DashboardReleaseWindowComponent implements OnInit {
  releaseData: ReleaseScheduleResponseDto | null = null;
  loading = true;
  error: string | null = null;
  countdown: string = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadReleaseSchedule();
    // Update countdown every minute
    setInterval(() => this.updateCountdown(), 60000);
  }

  loadReleaseSchedule() {
    this.loading = true;
    this.error = null;

    this.dashboardService.dashboardControllerGetReleaseSchedule().subscribe({
      next: (data: ReleaseScheduleResponseDto) => {
        this.releaseData = data;
        this.updateCountdown();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading release schedule:', err);
        this.error = 'Failed to load maintenance schedule';
        this.loading = false;
      }
    });
  }

  private updateCountdown() {
    if (!this.releaseData?.nextRelease?.startTime) {
      this.countdown = '';
      return;
    }

    const start = new Date(this.releaseData.nextRelease.startTime);
    const now = new Date();
    const diff = start.getTime() - now.getTime();

    if (diff <= 0) {
      this.countdown = 'In progress or completed';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    this.countdown = parts.join(' ') || 'Soon';
  }

  formatTimeRange(): string {
    if (!this.releaseData) return '';
    
    const start = new Date(this.releaseData.nextRelease.startTime);
    const end = new Date(this.releaseData.nextRelease.endTime);
    
    const startTime = start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endTime = end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    return `${startTime} — ${endTime} WIB`;
  }

  formatDate(): string {
    if (!this.releaseData) return '';
    
    const date = new Date(this.releaseData.nextRelease.startTime);
    return date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}
