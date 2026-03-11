import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dashboard } from '../../models/widget.models';
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

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DashboardModalComponent>,
    private projectsService: ProjectsService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; dashboard?: Dashboard }
  ) {
    this.mode = data.mode;
    
    this.form = this.fb.group({
      name: [data.dashboard?.name || '', [Validators.required, Validators.minLength(3)]],
      description: [data.dashboard?.description || ''],
      idProject: [data.dashboard?.projectId || null],
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

  save(): void {
    if (this.form.valid) {
      const result = {
        name: this.form.value.name,
        description: this.form.value.description,
        idProject: this.form.value.idProject || null
      };
      this.dialogRef.close(result);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
