import { Component } from '@angular/core';
import { Owner } from '../../../../models/iot';

interface OwnerForm extends Owner {
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}

@Component({
  selector: 'owners-add',
  templateUrl: './owners-add.html',
  styleUrls: ['./owners-add.scss'],
  standalone: false
})
export class OwnersAddPage {
  industryOptions = ['Water Utility', 'Manufacturing', 'Oil & Gas', 'Plantation', 'Other'];
  slaLevels = ['platinum', 'gold', 'silver', 'bronze'];

  form: OwnerForm = {
    idOwner: '',
    name: '',
    industry: this.industryOptions[0],
    contactPerson: '',
    slaLevel: this.slaLevels[1],
    contactEmail: '',
    contactPhone: '',
    address: '',
    notes: ''
  };

  submitOwner() {
    console.table(this.payload);
    alert('Demo only: payload printed in console');
  }

  get payload() {
    return {
      idOwner: this.form.idOwner || undefined,
      name: this.form.name,
      industry: this.form.industry,
      contactPerson: this.form.contactPerson,
      contactEmail: this.form.contactEmail,
      contactPhone: this.form.contactPhone,
      slaLevel: this.form.slaLevel,
      address: this.form.address,
      notes: this.form.notes
    };
  }
}
