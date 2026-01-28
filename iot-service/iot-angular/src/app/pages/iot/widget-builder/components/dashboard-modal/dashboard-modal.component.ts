import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dashboard } from '../../models/widget.models';

@Component({
  selector: 'app-dashboard-modal',
  standalone: false,
  templateUrl: './dashboard-modal.component.html',
  styleUrls: ['./dashboard-modal.component.css']
})
export class DashboardModalComponent {
  form: FormGroup;
  mode: 'create' | 'edit';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DashboardModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; dashboard?: Dashboard }
  ) {
    this.mode = data.mode;
    
    this.form = this.fb.group({
      name: [data.dashboard?.name || '', [Validators.required, Validators.minLength(3)]],
      description: [data.dashboard?.description || ''],
    });
  }

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
