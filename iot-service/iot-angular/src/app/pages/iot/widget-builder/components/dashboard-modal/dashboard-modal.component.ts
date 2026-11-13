import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dashboard, TIME_RANGE_PRESETS, REFRESH_INTERVALS } from '../../models/widget.models';
import { readScreenConfig, ScreenPreset, SCREEN_DEFAULT_ROWS } from '../../utils/screen-fit';
import { defaultPresetFrom, normalizeRefresh } from '../../utils/dashboard-time';
import { DashboardSettingsResult } from '../../utils/dashboard-settings';
import { FONT_SCALE_OPTIONS, readFontScale } from '../../utils/font-scale';
import { ProjectsService } from 'src/sdk/core/services';

interface ProjectOption {
  idProject: string;
  name: string;
}

@Component({
  selector: 'app-dashboard-modal',
  standalone: false,
  templateUrl: './dashboard-modal.component.html',
  styleUrls: ['./dashboard-modal.component.css']
})
export class DashboardModalComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'edit';
  projects: ProjectOption[] = [];
  loadingProjects = false;
  timePresets = TIME_RANGE_PRESETS;
  refreshIntervals = REFRESH_INTERVALS;
  fontScaleOptions = FONT_SCALE_OPTIONS;
  screenPresets: { value: ScreenPreset; label: string; hint: string }[] = [
    { value: 'auto', label: 'Otomatis (bisa scroll)', hint: 'Untuk layar kerja biasa' },
    { value: 'tv-16-9', label: 'TV 16:9 (1080p & 4K)', hint: 'Muat satu layar tanpa scroll — 4K tampil sama, lebih tajam' },
    { value: 'custom', label: 'Ukuran khusus', hint: 'Mis. video wall 3840×1080' },
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DashboardModalComponent>,
    private projectsService: ProjectsService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; dashboard?: Dashboard }
  ) {
    this.mode = data.mode;
    
    const screen = readScreenConfig(data.dashboard?.layoutConfig);
    this.form = this.fb.group({
      name: [data.dashboard?.name || '', [Validators.required, Validators.minLength(3)]],
      description: [data.dashboard?.description || ''],
      idProject: [data.dashboard?.projectId || null],
      screenPreset: [screen.preset as ScreenPreset],
      screenWidth: [screen.width, [Validators.min(320)]],
      screenHeight: [screen.height, [Validators.min(240)]],
      screenRows: [screen.rows || SCREEN_DEFAULT_ROWS, [Validators.min(4), Validators.max(48)]],
      timeRange: [defaultPresetFrom(data.dashboard?.timeRange)],
      refreshInterval: [normalizeRefresh(data.dashboard?.refreshInterval ?? 0)],
      fontScale: [readFontScale(data.dashboard?.layoutConfig)],
    });
    // TV screens should refresh by themselves: default to 1 minute when switching to a TV preset with refresh off.
    this.form.get('screenPreset')!.valueChanges.subscribe((p: ScreenPreset) => {
      if (p !== 'auto' && !this.form.value.refreshInterval) {
        this.form.patchValue({ refreshInterval: 60 });
      }
    });
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loadingProjects = true;
    this.projectsService.projectsControllerFindAll({ page: 1, limit: 200 }).subscribe({
      next: (response: any) => {
        this.projects = response?.data || response || [];
        this.loadingProjects = false;
      },
      error: (err: any) => {
        console.error('Failed to load projects:', err);
        this.loadingProjects = false;
      }
    });
  }

  get screenPreset(): ScreenPreset {
    return this.form.value.screenPreset;
  }

  get screenHint(): string {
    return this.screenPresets.find(p => p.value === this.screenPreset)?.hint || '';
  }

  save(): void {
    if (this.form.valid) {
      const v = this.form.value;
      const screen = readScreenConfig({
        screen: { preset: v.screenPreset, width: Number(v.screenWidth), height: Number(v.screenHeight), rows: Number(v.screenRows) },
      });
      const result: DashboardSettingsResult = {
        name: v.name,
        description: v.description,
        idProject: v.idProject || null,
        timeRange: v.timeRange,
        refreshInterval: Number(v.refreshInterval),
        screen,
        fontScale: readFontScale({ fontScale: Number(v.fontScale) }),
      };
      this.dialogRef.close(result);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
