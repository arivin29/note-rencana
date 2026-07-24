import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { NodeConfig, NodeModel, AddedSensor, PayloadField } from './pairing-workspace.types';
import { UnpairedDevicesService } from 'src/sdk/core/services';
import { UnpairedDeviceResponseDto } from 'src/sdk/core/models';
import { StepNodeConfigComponent } from './steps/step-node-config/step-node-config.component';
import { StepReviewSubmitComponent } from './steps/step-review-submit/step-review-submit.component';

@Component({
    selector: 'pairing-workspace-page',
    templateUrl: './pairing-workspace.html',
    styleUrls: ['./pairing-workspace.scss'],
    standalone: false
})
export class PairingWorkspacePage implements OnInit, OnDestroy {
    // ========================================
    // WIZARD STATE
    // ========================================
    @ViewChild(StepNodeConfigComponent) stepNodeConfig!: StepNodeConfigComponent;
    @ViewChild(StepReviewSubmitComponent) stepReviewSubmit!: StepReviewSubmitComponent;

    currentStep: 1 | 2 | 3 | 4 = 1;

    // Hardware info from unpaired device
    hardwareId = '';
    unpairedDevice: UnpairedDeviceResponseDto | null = null;
    detectedNodeModel = 'ESP32-Wroom-32D';
    ownerId = '8a3e0b64-da23-4469-b8d0-0c5f7bed9a22';
    projectId = 'bf750919-c68d-41c4-bd12-4b697bb10fd9';
    projectName = 'Water Management Alpha';
    id_node : string | null = null;
    idSensorProfile : string | null = null;
    loading = false;
    wizardSteps = [
        { id: 1, label: 'Node Configuration' },
        { id: 2, label: 'Add Sensors' },
        { id: 3, label: 'Payload Mapping' },
        { id: 4, label: 'Review & Submit' }
    ];

    onNodeChaneged(id_node: string | null) {
        this.id_node = id_node;
        
        // If we were waiting for node creation (loading=true from nextStep), 
        // auto-advance to step 2 now
        if (this.loading && id_node && this.currentStep === 1) {
            this.loading = false;
            this.currentStep = 2;
            this.saveState();
        }
    }

    onNodeCreateFailed(): void {
        this.loading = false;
    }

    onSensorProfileChanged(idSensorProfile: string | null) {
        this.idSensorProfile = idSensorProfile; 
    }

    // Step Data
    nodeConfig: NodeConfig = {
        mode: 'new',
        newNode: {
            nodeModelId: '',
            code: '',
            name: '',
            description: '',
            serialNumber: '',
            devEui: '',
            ipAddress: '',
            firmwareVersion: '',
            batteryType: 'Li-SOCl2',
            telemetryMode: 'push',
            telemetryIntervalSec: 120,
            // Location
            address: '',
            city: '',
            province: '',
            postalCode: '',
            country: 'Indonesia',
            latitude: '',
            longitude: '',
            elevationM: '',
            // Status & Environment
            status: 'active',
            installationType: '',
            enclosureRating: '',
            powerSource: '',
            // PIC
            picName: '',
            picPhone: '',
            picEmail: '',
            // Notes
            notes: ''
        }
    };

    addedSensors: AddedSensor[] = [];
    payloadMetadata: Record<string, PayloadField | undefined> = {};
    sensorProfileId: string | null = null;

    

    // Step validation states
    step1Valid = false;
    step2Valid = false;
    step3Valid = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private unpairedDevicesService: UnpairedDevicesService,
        private http: HttpClient
    ) { }

    private get storageKey(): string {
        return `pairing-wizard-${this.hardwareId}`;
    }

    ngOnInit(): void {
        this.hardwareId = this.route.snapshot.paramMap.get('hardwareId') || 'N/A';
        this.restoreState();
        this.loadUnpairedDevice();
    }

    ngOnDestroy(): void {
        // Save state when leaving (but not after successful submit)
        if (this.currentStep < 4) {
            this.saveState();
        }
    }

    private loadUnpairedDevice(): void {
        if (!this.hardwareId || this.hardwareId === 'N/A') {
            return;
        }

        this.loading = true;
        this.unpairedDevicesService.unpairedDevicesControllerFindByHardwareId({
            hardwareId: this.hardwareId
        }).subscribe({
            next: (device) => {
                this.unpairedDevice = device;
                this.prefillNodeConfig();
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load unpaired device', err);
                this.loading = false;
            }
        });
    }

    private prefillNodeConfig(): void {
        if (!this.unpairedDevice) return;

        // Pre-fill new node form with unpaired device data
        const idNodeModel = this.unpairedDevice.idNodeModel as any;
        this.nodeConfig.newNode = {
            nodeModelId: typeof idNodeModel === 'string' ? idNodeModel : '',
            code: this.unpairedDevice.hardwareId || '',
            name: '',
            description: '',
            serialNumber: this.unpairedDevice.hardwareId || '',
            devEui: this.unpairedDevice.hardwareId || '',
            ipAddress: '',
            firmwareVersion: '',
            batteryType: 'Li-SOCl2',
            telemetryMode: 'push',
            telemetryIntervalSec: 120,
            // Location
            address: '',
            city: '',
            province: '',
            postalCode: '',
            country: 'Indonesia',
            latitude: '',
            longitude: '',
            elevationM: '',
            // Status & Environment
            status: 'active',
            installationType: '',
            enclosureRating: '',
            powerSource: '',
            // PIC
            picName: '',
            picPhone: '',
            picEmail: '',
            // Notes
            notes: ''
        };
    }

    // ========================================
    // WIZARD NAVIGATION
    // ========================================

    nextStep(): void {
        if (this.canProceedToNextStep()) {
            // If moving from step 1 with new node mode, create the node first
            if (this.currentStep === 1 && this.nodeConfig.mode === 'new' && !this.id_node) {
                this.loading = true;
                this.stepNodeConfig.createNewNode();
                // Don't advance yet - wait for node creation callback
                return;
            }
            
            if (this.currentStep < 4) {
                this.currentStep = (this.currentStep + 1) as 1 | 2 | 3 | 4;
            }
        }
    }

    previousStep(): void {
        if (this.currentStep > 1) {
            this.currentStep = (this.currentStep - 1) as 1 | 2 | 3 | 4;
            this.saveState();
        }
    }

    goToStep(step: 1 | 2 | 3 | 4): void {
        this.currentStep = step;
    }

    canProceedToNextStep(): boolean {
        switch (this.currentStep) {
            case 1:
                return this.step1Valid;
            case 2:
                return this.step2Valid;
            case 3:
                return this.step3Valid;
            default:
                return true;
        }
    }

    // ========================================
    // EVENT HANDLERS FROM CHILD COMPONENTS
    // ========================================

    onNodeConfigChange(config: NodeConfig): void {
        this.nodeConfig = config;
        this.saveState();
    }

    onStep1ValidationChange(isValid: boolean): void {
        this.step1Valid = isValid;
    }

    onSensorsChange(sensors: AddedSensor[]): void {
        console.log('Added sensors updated:', sensors);
        this.addedSensors = sensors;
        this.saveState();
    }

    onStep2ValidationChange(isValid: boolean): void {
        this.step2Valid = isValid;
    }

    onStep3ValidationChange(isValid: boolean): void {
        this.step3Valid = isValid;
    }

    onPayloadMetadataChange(mapping: Record<string, PayloadField | undefined>): void {
        this.payloadMetadata = mapping;
        this.saveState();
    }

    onSensorProfileSelected(profileId: string): void {
        this.sensorProfileId = profileId || null;
        this.saveState();
    }

    getActiveNodeModelId(): string | undefined {
        if (this.nodeConfig.mode === 'existing') {
            return this.nodeConfig.selectedExistingNode?.idNodeModel;
        }
        return this.nodeConfig.newNode?.nodeModelId;
    }

    onSubmitPairing(payload: any): void {
        console.log('Submitting pairing configuration:', payload);

        // Node target: node baru (dibuat step 1) atau node existing yang dipilih.
        const nodeId = this.id_node || this.nodeConfig?.selectedExistingNode?.idNode || null;

        // Tautkan profil lewat endpoint assign-profile: backend menjamin SETIAP node
        // punya profil sendiri (duplikat bila sumber sudah dipakai node lain) — tak berbagi
        // instance, dan transaksional (tak ada lagi node tanpa profil). Ganti pola lama yang
        // meng-assign 1 profil bersama.
        if (nodeId && this.idSensorProfile) {
            this.loading = true;
            this.http.post(`${environment.apiUrl}/api/nodes/${nodeId}/assign-profile`, {
                idNodeProfile: this.idSensorProfile
            }).subscribe({
                next: () => this.finishPairing(nodeId),
                error: (err) => {
                    this.loading = false;
                    console.error('Failed to assign node profile', err);
                    alert('Node berhasil dibuat, tapi gagal menautkan profil. Coba set profil dari halaman node.');
                    this.finishPairing(nodeId);
                }
            });
            return;
        }

        this.finishPairing(nodeId);
    }

    private finishPairing(nodeId: string | null): void {
        this.loading = false;
        if (nodeId && this.stepReviewSubmit) {
            this.stepReviewSubmit.updateUnpairedDeviceStatus(nodeId);
        }
        this.clearState();
        alert('Pairing completed successfully!');
        this.router.navigate(['/iot/unpaired-devices']);
    }

    discardChanges(): void {
        if (confirm('Are you sure you want to discard all changes?')) {
            this.clearState();
            this.router.navigate(['/iot/unpaired-devices']);
        }
    }

    // ========================================
    // LOCAL STORAGE PERSISTENCE
    // ========================================

    private saveState(): void {
        try {
            const state = {
                currentStep: this.currentStep,
                nodeConfig: this.nodeConfig,
                id_node: this.id_node,
                idSensorProfile: this.idSensorProfile,
                addedSensors: this.addedSensors,
                sensorProfileId: this.sensorProfileId,
                payloadMetadata: this.payloadMetadata,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save pairing state:', e);
        }
    }

    private restoreState(): void {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const state = JSON.parse(saved);
            
            // Check if saved state is older than 24 hours
            const savedAt = new Date(state.savedAt);
            const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
            if (hoursSince > 24) {
                this.clearState();
                return;
            }

            // Restore wizard state
            if (state.currentStep) this.currentStep = state.currentStep;
            if (state.nodeConfig) this.nodeConfig = state.nodeConfig;
            if (state.id_node) this.id_node = state.id_node;
            if (state.idSensorProfile) this.idSensorProfile = state.idSensorProfile;
            if (state.addedSensors) this.addedSensors = state.addedSensors;
            if (state.sensorProfileId) this.sensorProfileId = state.sensorProfileId;
            if (state.payloadMetadata) this.payloadMetadata = state.payloadMetadata;

            console.log(`Restored pairing state at step ${this.currentStep} (saved ${Math.round(hoursSince * 60)}m ago)`);
        } catch (e) {
            console.warn('Failed to restore pairing state:', e);
            this.clearState();
        }
    }

    private clearState(): void {
        localStorage.removeItem(this.storageKey);
    }
}
