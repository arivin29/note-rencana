import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { CreateOwnerDto } from '../../../../../sdk/core/models/create-owner-dto';
import { UpdateOwnerDto } from '../../../../../sdk/core/models/update-owner-dto';
import { OwnerResponseDto } from '../../../../../sdk/core/models/owner-response-dto';

@Component({
  selector: 'owners-add',
  templateUrl: './owners-add.html',
  styleUrls: ['./owners-add.scss'],
  standalone: false
})
export class OwnersAddPage implements OnInit {
  loading = false;
  loadingData = false;
  error: string | null = null;

  ownerId: string | null = null;
  isEditMode = false;

  industryOptions = ['Water Treatment', 'Manufacturing', 'Oil & Gas', 'Plantation', 'Agriculture', 'Mining', 'Other'];
  slaLevels = ['Platinum', 'Gold', 'Silver', 'Bronze'];

  ownerForm!: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly ownersService: OwnersService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.ownerForm = this.fb.group({
      name: ['', Validators.required],
      industry: [this.industryOptions[0], Validators.required],
      contactPerson: ['', Validators.required],
      contactEmail: ['', Validators.email],
      contactPhone: [''],
      slaLevel: [this.slaLevels[1]],
      address: [''],
      notes: [''],
      forwarding: this.fb.group({
        enableWebhook: [true],
        webhookUrl: [''],
        enableDatabase: [false],
        batchSize: [100, [Validators.min(1), Validators.max(1000)]]
      })
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ownerId = params.get('ownerId');
      this.isEditMode = !!this.ownerId;
      
      if (this.isEditMode && this.ownerId) {
        this.loadOwner(this.ownerId);
      }
    });
  }

  get forwardingGroup() {
    return this.ownerForm.get('forwarding') as FormGroup;
  }

  hasError(controlName: string, error: string) {
    const control = this.ownerForm.get(controlName);
    return !!(control && control.hasError(error) && (control.dirty || control.touched));
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Owner' : 'Create Owner';
  }

  get breadcrumbTitle(): string {
    return this.isEditMode ? 'Edit' : 'Create';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Update Owner' : 'Save Owner';
  }

  private loadOwner(id: string): void {
    this.loadingData = true;
    this.error = null;

    this.ownersService.ownersControllerFindOne$Response({ id }).subscribe({
      next: (httpResponse) => {
        let data: any = httpResponse.body;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }

        // Populate form with existing data
        this.ownerForm.patchValue({
          name: data.name || '',
          industry: data.industry || this.industryOptions[0],
          contactPerson: data.contactPerson || '',
          contactEmail: data.email || '',
          contactPhone: data.phone || '',
          slaLevel: data.slaLevel || this.slaLevels[1],
          address: data.address || '',
          notes: data.notes || '',
          forwarding: {
            enableWebhook: data.forwardingSettings?.enableWebhook ?? true,
            webhookUrl: data.forwardingSettings?.webhookUrl || '',
            enableDatabase: data.forwardingSettings?.enableDatabase ?? false,
            batchSize: data.forwardingSettings?.batchSize || 100
          }
        });

        this.loadingData = false;
      },
      error: (err) => {
        this.loadingData = false;
        this.error = err?.error?.message || err?.message || 'Failed to load owner';
        console.error('Load owner failed', err);
      }
    });
  }

  submitOwner() {
    if (this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      return;
    }

    const formValue = this.ownerForm.value;
    const forwarding = formValue.forwarding;

    if (forwarding.enableWebhook && !forwarding.webhookUrl) {
      this.error = 'Webhook URL is required when webhook is enabled.';
      return;
    }

    if (this.isEditMode && this.ownerId) {
      this.updateOwner(formValue, forwarding);
    } else {
      this.createOwner(formValue, forwarding);
    }
  }

  private createOwner(formValue: any, forwarding: any) {
    this.loading = true;
    this.error = null;

    const payload: CreateOwnerDto & Record<string, any> = {
      name: formValue.name,
      industry: formValue.industry,
      contactPerson: formValue.contactPerson,
      slaLevel: formValue.slaLevel,
      forwardingSettings: {
        enableWebhook: forwarding.enableWebhook,
        webhookUrl: forwarding.webhookUrl || undefined,
        enableDatabase: forwarding.enableDatabase,
        batchSize: forwarding.batchSize
      }
    };

    if (formValue.contactEmail) {
      payload['email'] = formValue.contactEmail;
    }
    if (formValue.contactPhone) {
      payload['phone'] = formValue.contactPhone;
    }
    if (formValue.address) {
      payload['address'] = formValue.address;
    }
    if (formValue.notes) {
      payload['notes'] = formValue.notes;
    }

    this.ownersService.ownersControllerCreate({ body: payload }).subscribe({
      next: (response: OwnerResponseDto) => {
        this.loading = false;
        this.router.navigate(['/iot/owners'], {
          queryParams: { created: response.idOwner }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Failed to create owner';
        console.error('Create owner failed', err);
      }
    });
  }

  private updateOwner(formValue: any, forwarding: any) {
    this.loading = true;
    this.error = null;

    const payload: UpdateOwnerDto = {
      name: formValue.name,
      industry: formValue.industry,
      contactPerson: formValue.contactPerson,
      slaLevel: formValue.slaLevel,
      forwardingSettings: {
        enableWebhook: forwarding.enableWebhook,
        webhookUrl: forwarding.webhookUrl || undefined,
        enableDatabase: forwarding.enableDatabase,
        batchSize: forwarding.batchSize
      }
    };

    this.ownersService.ownersControllerUpdate$Response({
      id: this.ownerId!,
      body: payload
    }).subscribe({
      next: (httpResponse) => {
        let response: any = httpResponse.body;
        if (typeof response === 'string') {
          response = JSON.parse(response);
        }
        
        this.loading = false;
        this.router.navigate(['/iot/owners', response.idOwner]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Failed to update owner';
        console.error('Update owner failed', err);
      }
    });
  }

  get payload() {
    const formValue = this.ownerForm?.value;
    if (!formValue) {
      return {};
    }

    return {
      name: formValue.name,
      industry: formValue.industry,
      contactPerson: formValue.contactPerson,
      email: formValue.contactEmail || undefined,
      phone: formValue.contactPhone || undefined,
      slaLevel: formValue.slaLevel,
      address: formValue.address || undefined,
      notes: formValue.notes || undefined,
      forwardingSettings: {
        enableWebhook: formValue.forwarding?.enableWebhook,
        webhookUrl: formValue.forwarding?.webhookUrl || undefined,
        enableDatabase: formValue.forwarding?.enableDatabase,
        batchSize: formValue.forwarding?.batchSize
      }
    };
  }
}
