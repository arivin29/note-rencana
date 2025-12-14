import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UsersService } from '../../../../../sdk/core/services/users.service';
import { UserResponseDto } from '../../../../../sdk/core/models/user-response-dto';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-modal.html',
  styleUrl: './user-modal.scss',
})
export class UserModal implements OnInit {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() user: UserResponseDto | null = null;
  @Input() ownerId: string = '';
  @Input() ownerName: string = '';

  userForm!: FormGroup;
  saving = false;
  showPassword = false;

  private fb = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private usersService = inject(UsersService);

  ngOnInit(): void {
    this.initForm();

    // If creating from owner page, auto-set role to tenant
    if (this.mode === 'create' && this.ownerId) {
      this.userForm.patchValue({
        role: 'tenant'
      });
    }

    // If editing, populate form with user data
    if (this.mode === 'edit' && this.user) {
      this.userForm.patchValue({
        name: this.user.name,
        email: this.user.email,
        phone: this.user.phone || '',
        role: this.user.role,
        isActive: this.user.isActive
      });
    }
  }

  initForm(): void {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: this.mode === 'create' 
        ? ['', [Validators.required, Validators.minLength(8), Validators.pattern(passwordPattern)]]
        : [''],
      phone: [''],
      role: ['', Validators.required],
      isActive: [true]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  save(): void {
    if (this.userForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;

    if (this.mode === 'create') {
      this.createUser();
    } else {
      this.updateUser();
    }
  }

  createUser(): void {
    const formValue = this.userForm.value;
    
    const createDto = {
      name: formValue.name,
      email: formValue.email,
      password: formValue.password,
      phone: formValue.phone || undefined,
      role: formValue.role,
      idOwner: this.ownerId
    };

    this.usersService.usersControllerCreate({ body: createDto }).subscribe({
      next: () => {
        this.saving = false;
        this.activeModal.close('saved');
      },
      error: (err: any) => {
        console.error('Error creating user:', err);
        this.saving = false;
        const errorMsg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to create user: ${errorMsg}`);
      }
    });
  }

  updateUser(): void {
    if (!this.user) return;

    const formValue = this.userForm.value;
    
    const updateDto = {
      name: formValue.name,
      email: formValue.email,
      phone: formValue.phone || null,
      role: formValue.role,
      isActive: formValue.isActive
    };

    this.usersService.usersControllerUpdate({ 
      id: this.user.idUser,
      body: updateDto 
    }).subscribe({
      next: () => {
        this.saving = false;
        this.activeModal.close('saved');
      },
      error: (err: any) => {
        console.error('Error updating user:', err);
        this.saving = false;
        alert(`Failed to update user: ${err.error?.message || 'Unknown error'}`);
      }
    });
  }

  dismiss(): void {
    this.activeModal.dismiss('cancelled');
  }
}
