import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { OwnerResponseDto } from '../../../../../sdk/core/models/owner-response-dto';

interface OwnerForm {
  name: string;
  industry: string;
  contactPerson: string;
  slaLevel: string;
}

@Component({
  selector: 'owners-edit',
  templateUrl: './owners-edit.html',
  styleUrls: ['./owners-edit.scss'],
  standalone: false
})
export class OwnersEditPage implements OnInit {
  ownerId = '';
  saving = false;
  loading = false;
  successMessage = '';
  errorMessage = '';

  formModel: OwnerForm = {
    name: '',
    industry: '',
    contactPerson: '',
    slaLevel: ''
  };

  industryOptions = [
    'Utilities / Water Supply',
    'Oil & Gas',
    'Manufacturing',
    'Agriculture',
    'Smart City',
    'Mining',
    'Energy',
    'Transportation',
    'Other'
  ];

  slaOptions = ['platinum', 'gold', 'silver', 'bronze'];

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private ownersService: OwnersService
  ) {
    this.route.paramMap.subscribe((params) => {
      this.ownerId = params.get('ownerId') ?? '';
    });
  }

  ngOnInit() {
    if (this.ownerId) {
      this.loadOwnerData();
    }
  }

  loadOwnerData() {
    this.loading = true;
    this.ownersService.ownersControllerFindOne({ id: this.ownerId })
      .subscribe({
        next: (data: OwnerResponseDto) => {
          this.formModel = {
            name: data.name || '',
            industry: data.industry || '',
            contactPerson: data.contactPerson || '',
            slaLevel: data.slaLevel ? data.slaLevel.toLowerCase() : '' // Convert to lowercase for form
          };
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading owner:', err);
          this.errorMessage = 'Failed to load owner data';
          this.loading = false;
        }
      });
  }

  handleSubmit(formValid: boolean) {
    if (!formValid || this.saving) {
      return;
    }

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    // Capitalize slaLevel for backend
    const capitalizedSlaLevel = this.formModel.slaLevel 
      ? (this.formModel.slaLevel.charAt(0).toUpperCase() + this.formModel.slaLevel.slice(1)) as 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
      : undefined;

    const updateData = {
      name: this.formModel.name,
      industry: this.formModel.industry,
      contactPerson: this.formModel.contactPerson || undefined,
      slaLevel: capitalizedSlaLevel
    };

    this.ownersService.ownersControllerUpdate({
      id: this.ownerId,
      body: updateData
    }).subscribe({
      next: (response: OwnerResponseDto) => {
        this.saving = false;
        this.successMessage = 'Owner updated successfully!';
        
        // Redirect after 1.5 seconds
        setTimeout(() => {
          this.router.navigate(['/iot/owners', this.ownerId]);
        }, 1500);
      },
      error: (err) => {
        console.error('Error updating owner:', err);
        this.saving = false;
        this.errorMessage = err.error?.message || 'Failed to update owner';
      }
    });
  }
}
