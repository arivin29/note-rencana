import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OwnersService } from '../../../../../sdk/core/services';
import { CreateOwnerDto, OwnerResponseDto } from '../../../../../sdk/core/models';

interface OwnerForm {
    name: string;
    industry: string;
    contactPerson: string;
    slaLevel: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    notes: string;
    // Forwarding settings
    enableWebhook: boolean;
    webhookUrl: string;
    enableDatabase: boolean;
    batchSize: number;
}

@Component({
    selector: 'owners-add',
    templateUrl: './owners-add.html',
    styleUrls: ['./owners-add.scss'],
    standalone: false
})
export class OwnersAddPage {
    // Loading & Error state
    loading = false;
    error: string | null = null;
    successMessage: string | null = null;

    industryOptions = ['Water Treatment', 'Manufacturing', 'Oil & Gas', 'Plantation', 'Agriculture', 'Mining', 'Other'];
    slaLevels = ['platinum', 'gold', 'silver', 'bronze'];

    form: OwnerForm = {
        name: '',
        industry: this.industryOptions[0],
        contactPerson: '',
        slaLevel: this.slaLevels[1],
        contactEmail: '',
        contactPhone: '',
        address: '',
        notes: '',
        enableWebhook: true,
        webhookUrl: '',
        enableDatabase: false,
        batchSize: 100
    };

    constructor(
        private ownersService: OwnersService,
        private router: Router
    ) {}

    submitOwner() {
        this.loading = true;
        this.error = null;
        this.successMessage = null;

        // Validate required fields
        if (!this.form.name || !this.form.contactPerson) {
            this.error = 'Name and Contact Person are required';
            this.loading = false;
            return;
        }

        // Build CreateOwnerDto
        const createDto: CreateOwnerDto = {
            name: this.form.name,
            industry: this.form.industry,
            contactPerson: this.form.contactPerson,
            slaLevel: this.form.slaLevel as any,
            forwardingSettings: {
                enableWebhook: this.form.enableWebhook,
                webhookUrl: this.form.webhookUrl || undefined,
                enableDatabase: this.form.enableDatabase,
                batchSize: this.form.batchSize
            }
        };

        // Optional fields
        if (this.form.contactEmail) {
            (createDto as any).email = this.form.contactEmail;
        }
        if (this.form.contactPhone) {
            (createDto as any).phone = this.form.contactPhone;
        }
        if (this.form.address) {
            (createDto as any).address = this.form.address;
        }
        if (this.form.notes) {
            (createDto as any).notes = this.form.notes;
        }

        console.log('Creating owner with payload:', createDto);

        // Call API
        this.ownersService.ownersControllerCreate({ body: createDto }).subscribe(
            (response: OwnerResponseDto) => {
                this.loading = false;
                this.successMessage = `Owner "${response.name}" created successfully!`;
                console.log('Owner created:', response);

                // Redirect to list after 2 seconds
                setTimeout(() => {
                    this.router.navigate(['/iot/owners']);
                }, 2000);
            },
            (err: any) => {
                this.loading = false;
                this.error = err.error?.message || err.message || 'Failed to create owner';
                console.error('Error creating owner:', err);
            }
        );
    }

    get payload() {
        return {
            name: this.form.name,
            industry: this.form.industry,
            contactPerson: this.form.contactPerson,
            email: this.form.contactEmail || undefined,
            phone: this.form.contactPhone || undefined,
            slaLevel: this.form.slaLevel,
            address: this.form.address || undefined,
            notes: this.form.notes || undefined,
            forwardingSettings: {
                enableWebhook: this.form.enableWebhook,
                webhookUrl: this.form.webhookUrl || undefined,
                enableDatabase: this.form.enableDatabase,
                batchSize: this.form.batchSize
            }
        };
    }
}
