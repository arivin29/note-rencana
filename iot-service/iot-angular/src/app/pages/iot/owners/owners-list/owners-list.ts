import { Component } from '@angular/core';
import { Owner } from '../../../../models/iot';

type OwnerStatus = 'active' | 'trial' | 'suspended';

interface OwnerSummary extends Owner {
  contactEmail?: string;
  contactPhone?: string;
  projects: number;
  nodes: number;
  sensors: number;
  alerts: number;
  status: OwnerStatus;
  address: string;
  lastActivity: string;
}

@Component({
  selector: 'owners-list',
  templateUrl: './owners-list.html',
  styleUrls: ['./owners-list.scss'],
  standalone: false
})
export class OwnersListPage {
  owners: OwnerSummary[] = [
    {
      idOwner: 'owner-abc',
      name: 'PT ABC',
      industry: 'Water Utility',
      contactPerson: 'Iwan Nazar',
      contactEmail: 'iwan.nazar@ptabc.com',
      contactPhone: '+62 811-2345-678',
      slaLevel: 'gold',
      projects: 5,
      nodes: 320,
      sensors: 780,
      alerts: 6,
      status: 'active',
      address: 'Jl. Cut Mutia No.12, Banda Aceh',
      lastActivity: '09:12 UTC'
    },
    {
      idOwner: 'owner-xyz',
      name: 'PT XYZ',
      industry: 'Manufacturing',
      contactPerson: 'Satria Wijaya',
      contactEmail: 'satria@ptxyz.co.id',
      contactPhone: '+62 811-888-2323',
      slaLevel: 'silver',
      projects: 3,
      nodes: 120,
      sensors: 210,
      alerts: 1,
      status: 'trial',
      address: 'Kawasan Industri Cikarang',
      lastActivity: '08:45 UTC'
    },
    {
      idOwner: 'owner-delta',
      name: 'PT Delta',
      industry: 'Oil & Gas',
      contactPerson: 'Rika Puspa',
      contactEmail: 'rika@ptdelta.id',
      contactPhone: '+62 812-777-8899',
      slaLevel: 'platinum',
      projects: 4,
      nodes: 210,
      sensors: 510,
      alerts: 3,
      status: 'active',
      address: 'Balikpapan, Kalimantan Timur',
      lastActivity: '09:00 UTC'
    },
    {
      idOwner: 'owner-citra',
      name: 'PT Citra',
      industry: 'Plantation',
      contactPerson: 'Dewi Ratna',
      contactEmail: 'dewi@ptcitra.com',
      contactPhone: '+62 813-111-2211',
      slaLevel: 'bronze',
      projects: 2,
      nodes: 58,
      sensors: 140,
      alerts: 5,
      status: 'suspended',
      address: 'Medan, Sumatera Utara',
      lastActivity: 'Yesterday'
    }
  ];

  filters = {
    status: 'All Status',
    industry: 'All Industry'
  };
  searchTerm = '';

  pageSizeOptions = [10, 20, 50];
  pageSize = 10;
  currentPage = 1;

  statusOptions: Array<'All Status' | OwnerStatus> = ['All Status', 'active', 'trial', 'suspended'];
  industryOptions = ['All Industry', ...new Set(this.owners.map((owner) => owner.industry || 'Unknown'))];

  setFilter(type: 'status' | 'industry', value: string) {
    this.filters[type] = value;
    this.currentPage = 1;
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.currentPage = 1;
  }

  changePageSize(size: number | string) {
    const parsed = Number(size);
    if (!isNaN(parsed) && parsed > 0) {
      this.pageSize = parsed;
      this.currentPage = 1;
    }
  }

  goToPage(page: number) {
    const totalPages = this.totalPages;
    if (page < 1 || page > totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
  }

  get filteredOwners() {
    const search = this.searchTerm.trim().toLowerCase();

    return this.owners.filter((owner) => {
      const matchStatus = this.filters.status === 'All Status' || owner.status === this.filters.status;
      const matchIndustry =
        this.filters.industry === 'All Industry' || (owner.industry || 'Unknown') === this.filters.industry;
      const searchPool = [owner.name, owner.idOwner, owner.contactPerson || '', owner.address, owner.contactEmail || '']
        .join(' ')
        .toLowerCase();
      const matchSearch = !search || searchPool.includes(search);

      return matchStatus && matchIndustry && matchSearch;
    });
  }

  get paginatedOwners() {
    const owners = this.filteredOwners;
    const totalPages = this.computeTotalPages(owners.length);
    const currentPage = this.normalizeCurrentPage(totalPages);
    const start = (currentPage - 1) * this.pageSize;
    return owners.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return this.computeTotalPages(this.filteredOwners.length);
  }

  get pageNumbers() {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginationStart() {
    if (!this.filteredOwners.length) {
      return 0;
    }
    const currentPage = this.normalizeCurrentPage(this.totalPages);
    return (currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd() {
    if (!this.filteredOwners.length) {
      return 0;
    }
    return Math.min(this.paginationStart + this.pageSize - 1, this.filteredOwners.length);
  }

  get totalEntries() {
    return this.filteredOwners.length;
  }

  statusBadge(status: OwnerStatus) {
    switch (status) {
      case 'active':
        return 'badge bg-success-subtle text-success';
      case 'trial':
        return 'badge bg-info-subtle text-info';
      default:
        return 'badge bg-secondary-subtle text-secondary';
    }
  }

  statusCount(option: 'All Status' | OwnerStatus) {
    if (option === 'All Status') {
      return this.owners.length;
    }
    return this.owners.filter((owner) => owner.status === option).length;
  }

  private computeTotalPages(count: number) {
    return count === 0 ? 1 : Math.ceil(count / this.pageSize);
  }

  private normalizeCurrentPage(totalPages: number) {
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    return this.currentPage;
  }
}
