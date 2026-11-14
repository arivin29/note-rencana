import { Component, Input, Output, EventEmitter, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UsersService } from '@sdk/core/services/users.service';
import { OwnersService } from '@sdk/core/services/owners.service';
import { CreateUserDto } from '@sdk/core/models/create-user-dto';
import { UpdateUserDto } from '@sdk/core/models/update-user-dto';
import { UserResponseDto } from '@sdk/core/models/user-response-dto';
import { OwnerResponseDto } from '@sdk/core/models/owner-response-dto';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
    standalone: false,
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnChanges, OnInit {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() user: UserResponseDto | null = null;
  @Input() showAsModal: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<UserResponseDto>();

  formData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
    idOwner: string;
    isActive: boolean;
  } = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'tenant',
    idOwner: '',
    isActive: true
  };

  saving = false;
  errorMessage = '';

  /**
   * Daftar owner untuk dropdown. Sebelumnya kolom ini kotak teks bebas yang
   * menyuruh admin mengetik UUID dengan tangan, dan keterangannya sendiri
   * bilang "(optional)" — padahal tenant tanpa owner justru bisa membaca data
   * SEMUA PDAM. Mode gagalnya terbalik: salah ketik UUID = user tak melihat
   * apa-apa (aman), dikosongkan = user melihat segalanya (bocor).
   */
  owners: OwnerResponseDto[] = [];
  loadingOwners = false;
  ownersError = '';

  constructor(
    private usersService: UsersService,
    private ownersService: OwnersService
  ) {}

  ngOnInit(): void {
    this.loadOwners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] || changes['mode']) {
      this.initializeForm();
    }
  }

  loadOwners(): void {
    this.loadingOwners = true;
    this.ownersError = '';

    this.ownersService.ownersControllerFindAll({ page: 1, limit: 200 }).subscribe({
      next: (response: any) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.owners = (parsed?.data || []) as OwnerResponseDto[];
        this.loadingOwners = false;
      },
      error: (err) => {
        this.loadingOwners = false;
        // Jangan diam-diam menampilkan dropdown kosong — admin akan menyangka
        // memang belum ada owner, lalu mencari jalan lain.
        this.ownersError = 'Gagal memuat daftar owner.';
        console.error('Load owners error:', err);
      }
    });
  }

  /**
   * Admin tidak boleh terikat owner — justru ketidakterikatan itu yang membuat
   * superadmin bisa berpindah-pindah owner. Jadi begitu role diubah ke admin,
   * owner yang sempat terpilih dibersihkan supaya tidak terkirim ke backend.
   */
  onRoleChange(): void {
    if (this.formData.role === 'admin') {
      this.formData.idOwner = '';
    }
  }

  private initializeForm(): void {
    if (this.mode === 'edit' && this.user) {
      this.formData = {
        name: this.user.name || '',
        email: this.user.email || '',
        password: '',
        confirmPassword: '',
        role: this.user.role || 'tenant',
        idOwner: this.user.idOwner || '',
        isActive: this.user.isActive !== false
      };
    } else {
      // Reset form for create mode
      this.formData = {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'tenant',
        idOwner: '',
        isActive: true
      };
    }
    this.errorMessage = '';
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }

    // Password validation
    if (this.formData.password && this.formData.password !== this.formData.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.mode === 'create') {
      if (!this.formData.password) {
        this.errorMessage = 'Password is required for new users';
        return;
      }
      this.createUser();
    } else {
      this.updateUser();
    }
  }

  private createUser(): void {
    this.saving = true;
    this.errorMessage = '';

    const createDto: CreateUserDto = {
      name: this.formData.name,
      email: this.formData.email,
      password: this.formData.password,
      role: this.formData.role as 'admin' | 'tenant',
      idOwner: this.formData.idOwner || undefined
    };

    this.usersService.usersControllerCreate({ body: createDto }).subscribe({
      next: (response) => {
        this.saving = false;
        this.save.emit(response);
        this.close.emit();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create user. Please try again.';
        console.error('Create user error:', error);
      }
    });
  }

  private updateUser(): void {
    if (!this.user?.idUser) {
      this.errorMessage = 'User ID is missing';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const updateDto: UpdateUserDto = {
      name: this.formData.name,
      email: this.formData.email,
      role: this.formData.role as 'admin' | 'tenant',
      idOwner: this.formData.idOwner || undefined,
      isActive: this.formData.isActive
    };

    this.usersService.usersControllerUpdate({ 
      id: this.user.idUser, 
      body: updateDto 
    }).subscribe({
      next: (response) => {
        // If password was provided, also update it via the change-password endpoint
        if (this.formData.password) {
          this.usersService.usersControllerChangePassword({
            id: this.user!.idUser,
            body: { newPassword: this.formData.password }
          }).subscribe({
            next: () => {
              this.saving = false;
              this.save.emit(response);
              this.close.emit();
            },
            error: (pwError) => {
              this.saving = false;
              this.errorMessage = pwError?.error?.message || 'Profile updated but password change failed.';
              console.error('Change password error:', pwError);
            }
          });
        } else {
          this.saving = false;
          this.save.emit(response);
          this.close.emit();
        }
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update user. Please try again.';
        console.error('Update user error:', error);
      }
    });
  }

  onClose(): void {
    if (!this.saving) {
      this.close.emit();
    }
  }

  onBackdropClick(): void {
    if (!this.saving) {
      this.close.emit();
    }
  }

  onModalClick(event: Event): void {
    event.stopPropagation();
  }
}
