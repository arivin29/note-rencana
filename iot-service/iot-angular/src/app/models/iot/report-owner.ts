export interface Owner {
  idOwner: string;
  name: string;
  industry?: string;
  contactPerson?: string;
  slaLevel?: string;
}

export interface ReportOwner extends Owner {}
