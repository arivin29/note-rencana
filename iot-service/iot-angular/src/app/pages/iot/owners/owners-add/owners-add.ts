import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OwnersService } from '@sdk/core/services/owners.service';
import { fetchAll, parseBody } from '@app/shared/utils/fetch-all';
import { BASE_INDUSTRIES, SLA_LEVELS, normalizeSla } from '../owner-form-options';

/** Fields the backend owner DTO accepts (create & update share it). */
interface OwnerPayload {
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  slaLevel: string;
}

@Component({
  selector: 'owners-add',
  templateUrl: './owners-add.html',
  styleUrls: ['./owners-add.scss'],
  standalone: false
})
export class OwnersAddPage implements OnInit, OnDestroy {
  saving = false;
  loadingData = false;
  loadError: string | null = null;
  error: string | null = null;

  ownerId: string | null = null;
  isEditMode = false;

  industryOptions: string[] = [...BASE_INDUSTRIES];
  slaLevels: string[] = [...SLA_LEVELS];

  ownerForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly ownersService: OwnersService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.ownerForm = this.fb.group({
      name: ['', Validators.required],
      industry: ['', Validators.required],
      contactPerson: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      slaLevel: [''],
      address: ['']
    });
  }

  ngOnInit(): void {
    this.loadIndustryOptions();
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.ownerId = params.get('ownerId');
      this.isEditMode = !!this.ownerId;
      this.error = null;
      if (this.ownerId) {
        this.loadOwner(this.ownerId);
      } else {
        this.ownerForm.reset({ name: '', industry: '', contactPerson: '', email: '', phone: '', slaLevel: '', address: '' });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pageTitle(): string { return this.isEditMode ? 'Ubah Owner' : 'Tambah Owner'; }
  get breadcrumbTitle(): string { return this.isEditMode ? 'Ubah' : 'Tambah'; }
  get backLink(): any[] { return this.isEditMode && this.ownerId ? ['/iot/owners', this.ownerId] : ['/iot/owners']; }

  hasError(controlName: string, error: string): boolean {
    const control = this.ownerForm.get(controlName);
    return !!(control && control.hasError(error) && (control.dirty || control.touched));
  }

  loadOwner(id: string): void {
    this.loadingData = true;
    this.loadError = null;
    this.ownersService.ownersControllerFindOne$Response({ id }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const d: any = parseBody(res.body) ?? {};
        const industry = (d.industry || '').trim();
        const sla = normalizeSla(d.slaLevel) ?? '';
        this.ensureOption(this.industryOptions, industry);
        this.ensureOption(this.slaLevels, sla);
        this.ownerForm.reset({
          name: d.name || '',
          industry,
          contactPerson: d.contactPerson || '',
          email: d.email || '',
          phone: d.phone || '',
          slaLevel: sla,
          address: d.address || ''
        });
        this.loadingData = false;
      },
      error: (err) => {
        this.loadingData = false;
        this.loadError = err?.status === 404 ? 'Owner tidak ditemukan.' : (err?.error?.message || 'Gagal memuat data owner.');
      }
    });
  }

  submitOwner(): void {
    if (this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      return;
    }
    const body = this.buildPayload();
    this.saving = true;
    this.error = null;

    const request$ = this.isEditMode && this.ownerId
      ? this.ownersService.ownersControllerUpdate$Response({ id: this.ownerId, body: body as any })
      : this.ownersService.ownersControllerCreate$Response({ body: body as any });

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const saved: any = parseBody(res.body) ?? {};
        this.saving = false;
        const id = saved.idOwner || this.ownerId;
        this.router.navigate(id ? ['/iot/owners', id] : ['/iot/owners']);
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message;
        this.error = (Array.isArray(msg) ? msg.join(', ') : msg) || 'Gagal menyimpan owner. Coba lagi.';
      }
    });
  }

  /**
   * ONE payload for create AND update. Every field is sent (trimmed; empty = cleared),
   * so editing email/phone/address/SLA is actually saved. Forwarding settings are not
   * touched here (forwarding is hidden for now; existing values stay as they are).
   */
  private buildPayload(): OwnerPayload {
    const v = this.ownerForm.value;
    const t = (x: any) => (typeof x === 'string' ? x.trim() : '');
    return {
      name: t(v.name),
      industry: t(v.industry),
      contactPerson: t(v.contactPerson),
      email: t(v.email),
      phone: t(v.phone),
      address: t(v.address),
      slaLevel: t(v.slaLevel)
    };
  }

  /** Industry choices = suggestions + every value already used by an owner (so edit never blanks one). */
  private loadIndustryOptions(): void {
    fetchAll(p => this.ownersService.ownersControllerFindAll$Response(p))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (owners) => {
          for (const o of owners) this.ensureOption(this.industryOptions, (o?.industry || '').trim());
        },
        error: () => { /* suggestions only; the form still works with the base list + current value */ }
      });
  }

  private ensureOption(list: string[], value: string): void {
    if (value && !list.some(x => x.toLowerCase() === value.toLowerCase())) list.push(value);
  }
}
