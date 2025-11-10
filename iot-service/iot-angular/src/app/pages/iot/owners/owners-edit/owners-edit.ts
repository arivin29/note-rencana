import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface OwnerForm {
  name: string;
  industry: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  slaLevel: string;
  timezone: string;
  address: string;
  notes: string;
  forwardingWebhookEnabled: boolean;
  forwardingDbEnabled: boolean;
}

@Component({
  selector: 'owners-edit',
  templateUrl: './owners-edit.html',
  styleUrls: ['./owners-edit.scss'],
  standalone: false
})
export class OwnersEditPage {
  ownerId = '';
  saving = false;

  formModel: OwnerForm = {
    name: 'PT Adhi Tirta Utama',
    industry: 'Utilities / Water Supply',
    contactPerson: 'Farhan Prasetyo',
    contactEmail: 'farhan@adhiwater.co.id',
    contactPhone: '+62 811-2345-678',
    slaLevel: 'gold',
    timezone: 'Asia/Jakarta',
    address: 'Jl. Raya Industri No. 12, Bekasi, Jawa Barat',
    notes: '',
    forwardingWebhookEnabled: true,
    forwardingDbEnabled: false
  };

  industryOptions = [
    'Utilities / Water Supply',
    'Oil & Gas',
    'Manufacturing',
    'Agriculture',
    'Smart City',
    'Other'
  ];

  slaOptions = ['platinum', 'gold', 'silver', 'bronze'];

  constructor(route: ActivatedRoute, private router: Router) {
    route.paramMap.subscribe((params) => {
      this.ownerId = params.get('ownerId') ?? '';
    });
  }

  handleSubmit(formValid: boolean) {
    if (!formValid || this.saving) {
      return;
    }

    this.saving = true;
    setTimeout(() => {
      this.saving = false;
      this.router.navigate(['/iot/owners', this.ownerId]);
    }, 800);
  }
}
