import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, interval, switchMap, filter, take } from 'rxjs';

import { WebGisUploadService } from '../../../../../sdk/core/services';
import { UploadStatusResponseDto } from '../../../../../sdk/core/models';

type UploadStep = 'upload' | 'parsing' | 'mapping' | 'completed';

interface MappingField {
  sourceField: string;
  targetField: string;
}

@Component({
  selector: 'layer-upload',
  templateUrl: './layer-upload.html',
  styleUrls: ['./layer-upload.scss'],
  standalone: false
})
export class LayerUploadPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Steps
  currentStep: UploadStep = 'upload';
  
  // Upload state
  selectedFile: File | null = null;
  uploading = false;
  uploadError: string | null = null;
  uploadId: string | null = null;
  
  // Parsing state
  parsing = false;
  parsedResult: any = null;
  
  // Mapping state
  layerName = '';
  layerCode = '';
  selectedCategory = '';
  fieldMappings: MappingField[] = [];
  submitting = false;
  
  // Categories
  categories: any[] = [];
  loadingCategories = false;

  // Accepted file types
  acceptedTypes = '.geojson,.json,.csv,.kml,.shp,.zip';

  constructor(
    private uploadService: WebGisUploadService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.loadingCategories = true;
    // Use HTTP directly since SDK returns void
    this.http.get<any[]>('/api/webgis/categories')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cats) => {
          this.categories = cats || [];
          this.loadingCategories = false;
        },
        error: () => {
          this.categories = [];
          this.loadingCategories = false;
        }
      });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadError = null;
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
      this.uploadError = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.uploadError = null;

    // Use SDK upload method
    this.uploadService.uploadControllerUpload({ body: { file: this.selectedFile as any } })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: UploadStatusResponseDto) => {
          this.uploadId = response.idUpload;
          this.uploading = false;
          this.currentStep = 'parsing';
          this.pollParsingStatus();
        },
        error: (err: any) => {
          this.uploadError = err.error?.message || 'Upload failed';
          this.uploading = false;
        }
      });
  }

  private pollParsingStatus(): void {
    if (!this.uploadId) return;

    this.parsing = true;

    // Poll every 2 seconds until parsed
    interval(2000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.uploadService.uploadControllerGetStatus({ id: this.uploadId! })),
        filter((status: UploadStatusResponseDto) => 
          status.status === 'parsed' || status.status === 'failed'
        ),
        take(1)
      )
      .subscribe({
        next: (status: UploadStatusResponseDto) => {
          this.parsing = false;
          if (status.status === 'parsed') {
            this.loadParsedResult();
          } else {
            this.uploadError = status.errorMessage || 'Parsing failed';
            this.currentStep = 'upload';
          }
        },
        error: () => {
          this.parsing = false;
          this.uploadError = 'Failed to check parsing status';
          this.currentStep = 'upload';
        }
      });
  }

  private loadParsedResult(): void {
    if (!this.uploadId) return;

    this.uploadService.uploadControllerGetParsedResult({ id: this.uploadId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          this.parsedResult = result;
          this.initFieldMappings();
          this.currentStep = 'mapping';
        },
        error: () => {
          this.uploadError = 'Failed to load parsed result';
          this.currentStep = 'upload';
        }
      });
  }

  private initFieldMappings(): void {
    if (!this.parsedResult?.fields) return;

    // Fields might be strings or objects depending on serialization
    const fields: any[] = this.parsedResult.fields;
    
    // Use suggested mappings if available, otherwise map 1:1
    if (this.parsedResult.suggestedMappings?.length) {
      const mappings: any[] = this.parsedResult.suggestedMappings;
      this.fieldMappings = mappings.map((m: any) => {
        const mapping = typeof m === 'string' ? JSON.parse(m) : m;
        return {
          sourceField: mapping.sourceField || mapping,
          targetField: mapping.targetField || mapping
        };
      });
    } else {
      this.fieldMappings = fields.map((f: any) => {
        const field = typeof f === 'string' ? { name: f } : f;
        return {
          sourceField: field.name || f,
          targetField: field.name || f
        };
      });
    }

    // Auto-generate layer name from file
    if (this.selectedFile) {
      const baseName = this.selectedFile.name.replace(/\.[^.]+$/, '');
      this.layerName = baseName.replace(/[_-]/g, ' ');
      this.layerCode = baseName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
  }

  updateMapping(index: number, targetField: string): void {
    this.fieldMappings[index].targetField = targetField;
  }

  removeMapping(index: number): void {
    this.fieldMappings.splice(index, 1);
  }

  submitMapping(): void {
    if (!this.uploadId || !this.layerName) return;

    this.submitting = true;

    const mappings = this.fieldMappings.map(m => ({
      sourceField: m.sourceField,
      targetField: m.targetField
    }));

    this.uploadService.uploadControllerSubmitMapping({
      id: this.uploadId,
      body: {
        layerName: this.layerName,
        layerCode: this.layerCode || undefined,
        categoryCode: this.selectedCategory || undefined,
        fieldMappings: mappings
      }
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.currentStep = 'completed';
        },
        error: (err: any) => {
          this.uploadError = err.error?.message || 'Failed to create layer';
          this.submitting = false;
        }
      });
  }

  goToMap(): void {
    this.router.navigate(['/iot/webgis']);
  }

  resetUpload(): void {
    this.selectedFile = null;
    this.uploadId = null;
    this.parsedResult = null;
    this.fieldMappings = [];
    this.layerName = '';
    this.layerCode = '';
    this.selectedCategory = '';
    this.uploadError = null;
    this.currentStep = 'upload';
  }
}
