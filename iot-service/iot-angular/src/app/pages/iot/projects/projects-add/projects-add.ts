import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProjectsService } from '../../../../../sdk/core/services/projects.service';
import { OwnersService } from '../../../../../sdk/core/services/owners.service';
import { CreateProjectDto } from '../../../../../sdk/core/models/create-project-dto';
import { UpdateProjectDto } from '../../../../../sdk/core/models/update-project-dto';

type AreaType = 'plant' | 'pipeline' | 'farm' | 'industrial' | 'other';

interface OwnerOption {
  idOwner: string;
  name: string;
}

@Component({
  selector: 'projects-add',
  templateUrl: './projects-add.html',
  styleUrls: ['./projects-add.scss'],
  standalone: false
})
export class ProjectsAddPage implements OnInit {
  projectForm!: FormGroup;
  ownerOptions: OwnerOption[] = [];
  areaTypes: AreaType[] = ['plant', 'pipeline', 'farm', 'industrial', 'other'];
  
  // Edit mode
  projectId: string | null = null;
  isEditMode = false;
  
  loading = false;
  loadingOwners = false;
  loadingProject = false;
  error: string | null = null;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private ownersService: OwnersService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('projectId');
      this.isEditMode = !!this.projectId;
      
      console.log('Mode:', this.isEditMode ? 'EDIT' : 'CREATE', 'ID:', this.projectId);
      
      this.loadOwners();
      
      if (this.isEditMode && this.projectId) {
        this.loadProject(this.projectId);
      }
    });
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Project' : 'Create Project';
  }

  get submitButtonText(): string {
    if (this.submitting) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update Project' : 'Create Project';
  }

  private initForm(): void {
    this.projectForm = this.fb.group({
      idOwner: ['', [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      areaType: ['plant' as AreaType],
      status: ['active', [Validators.required]],
      geofence: ['']
    });
  }

  loadProject(id: string): void {
    this.loadingProject = true;
    this.error = null;

    this.projectsService.projectsControllerFindOne$Response({ id }).subscribe({
      next: (response) => {
        let data: any = response.body;
        
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        console.log('Loaded project for edit:', data);
        
        // Parse geofence to JSON string if it's an object
        let geofenceStr = '';
        if (data.geofence) {
          geofenceStr = typeof data.geofence === 'string' 
            ? data.geofence 
            : JSON.stringify(data.geofence, null, 2);
        }
        
        // Populate form with existing data
        this.projectForm.patchValue({
          idOwner: data.idOwner,
          name: data.name,
          areaType: data.areaType || 'plant',
          status: data.status || 'active',
          geofence: geofenceStr
        });
        
        this.loadingProject = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load project';
        this.loadingProject = false;
        console.error('Error loading project:', err);
      }
    });
  }

  loadOwners(): void {
    this.loadingOwners = true;
    
    this.ownersService.ownersControllerFindAll$Response({
      page: 1,
      limit: 200
    }).subscribe({
      next: (response) => {
        let data: any = response.body;
        
        // Parse JSON string if needed
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        const items = this.extractDataArray(data);
        this.ownerOptions = items.map((owner: any) => ({
          idOwner: owner.idOwner || owner.id,
          name: owner.name || owner.companyName || 'Unknown Owner'
        }));
        
        // Set first owner as default only if creating new project
        if (!this.isEditMode && this.ownerOptions.length > 0) {
          this.projectForm.patchValue({
            idOwner: this.ownerOptions[0].idOwner
          });
        }
        
        this.loadingOwners = false;
      },
      error: (err) => {
        this.error = 'Failed to load owners';
        this.loadingOwners = false;
        console.error('Error loading owners:', err);
      }
    });
  }

  submitProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    const formValue = this.projectForm.value;
    
    // Parse geofence if provided
    let geofence: any = null;
    if (formValue.geofence && formValue.geofence.trim()) {
      try {
        geofence = JSON.parse(formValue.geofence);
      } catch (e) {
        this.error = 'Invalid GeoJSON format in geofence field';
        this.submitting = false;
        return;
      }
    }

    if (this.isEditMode && this.projectId) {
      // UPDATE MODE
      this.updateProject(formValue, geofence);
    } else {
      // CREATE MODE
      this.createProject(formValue, geofence);
    }
  }

  private createProject(formValue: any, geofence: any): void {
    const createDto: CreateProjectDto = {
      idOwner: formValue.idOwner,
      name: formValue.name,
      areaType: formValue.areaType,
      status: formValue.status || 'active',
      geofence: geofence
    };

    console.log('Creating project with DTO:', createDto);

    this.projectsService.projectsControllerCreate$Response({
      body: createDto
    }).subscribe({
      next: (response) => {
        let data: any = response.body;
        
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        console.log('Project created successfully:', data);
        
        const projectId = data.idProject || data.id;
        if (projectId) {
          this.router.navigate(['/iot/projects', projectId]);
        } else {
          this.router.navigate(['/iot/projects']);
        }
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Failed to create project';
        this.submitting = false;
        console.error('Error creating project:', err);
      }
    });
  }

  private updateProject(formValue: any, geofence: any): void {
    const updateDto: UpdateProjectDto = {
      name: formValue.name,
      areaType: formValue.areaType,
      status: formValue.status,
      geofence: geofence
      // Note: idOwner tidak bisa diubah setelah project dibuat
    };

    console.log('Updating project with DTO:', updateDto);

    this.projectsService.projectsControllerUpdate$Response({
      id: this.projectId!,
      body: updateDto
    }).subscribe({
      next: (response) => {
        let data: any = response.body;
        
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        
        console.log('Project updated successfully:', data);
        
        // Navigate to project detail
        this.router.navigate(['/iot/projects', this.projectId]);
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Failed to update project';
        this.submitting = false;
        console.error('Error updating project:', err);
      }
    });
  }

  get projectPayload() {
    if (!this.projectForm) {
      return {};
    }

    const formValue = this.projectForm.value;
    let geofence = null;
    
    if (formValue.geofence && formValue.geofence.trim()) {
      try {
        geofence = JSON.parse(formValue.geofence);
      } catch (e) {
        geofence = formValue.geofence;
      }
    }

    return {
      idOwner: formValue.idOwner,
      name: formValue.name,
      areaType: formValue.areaType,
      status: formValue.status || 'active',
      geofence: geofence
    };
  }

  private extractDataArray(payload: any): any[] {
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
    return [];
  }
}
