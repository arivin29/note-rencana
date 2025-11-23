import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
export class PairingWorkspacePage implements OnInit {
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
            serialNumber: '',
            devEui: '',
            ipAddress: '',
            firmwareVersion: '',
            batteryType: 'Li-SOCl2',
            telemetryMode: 'push',
            telemetryIntervalSec: 120,
            locationType: 'manual',
            latitude: '',
            longitude: '',
            address: ''
        }
    };

    addedSensors: AddedSensor[] = [];
    payloadMetadata: Record<string, PayloadField | undefined> = {};
    sensorProfileId: string | null = null;

    // Available node models
    nodeModels: NodeModel[] = [
        {
            idNodeModel: 'd832d8b8-306f-46e0-bcc3-0a6e1f772683',
            name: 'ESP32-WROOM-32D',
            manufacturer: 'Espressif',
            description: 'Dual-core WiFi/BLE module'
        },
        {
            idNodeModel: 'a1b2c3d4-5678-90ab-cdef-123456789abc',
            name: 'Arduino MKR WAN 1310',
            manufacturer: 'Arduino',
            description: 'LoRaWAN connectivity module'
        },
        {
            idNodeModel: 'b2c3d4e5-6789-01bc-def0-234567890bcd',
            name: 'Raspberry Pi Pico W',
            manufacturer: 'Raspberry Pi',
            description: 'WiFi-enabled microcontroller'
        }
    ];

    // Step validation states
    step1Valid = false;
    step2Valid = false;
    step3Valid = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private unpairedDevicesService: UnpairedDevicesService
    ) { }

    ngOnInit(): void {
        this.hardwareId = this.route.snapshot.paramMap.get('hardwareId') || 'N/A';
        this.loadUnpairedDevice();
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
            serialNumber: this.unpairedDevice.hardwareId || '',
            devEui: this.unpairedDevice.hardwareId || '',
            ipAddress: '',
            firmwareVersion: '',
            batteryType: 'Li-SOCl2',
            telemetryMode: 'push',
            telemetryIntervalSec: 120,
            locationType: 'manual',
            latitude: '',
            longitude: '',
            address: ''
        };
    }

    // ========================================
    // WIZARD NAVIGATION
    // ========================================

    nextStep(): void {
        if (this.canProceedToNextStep()) {
            // If moving from step 1 with new node mode, create the node first
            if (this.currentStep === 1 && this.nodeConfig.mode === 'new' && !this.id_node) {
                this.stepNodeConfig.createNewNode();
                // The node creation will emit the id_node via selectNode event
                // and then we can proceed to next step automatically
                // For now, let's just proceed since the event handler will set id_node
            }
            
            if (this.currentStep < 4) {
                this.currentStep = (this.currentStep + 1) as 1 | 2 | 3 | 4;
            }
        }
    }

    previousStep(): void {
        if (this.currentStep > 1) {
            this.currentStep = (this.currentStep - 1) as 1 | 2 | 3 | 4;
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
    }

    onStep1ValidationChange(isValid: boolean): void {
        this.step1Valid = isValid;
    }

    onSensorsChange(sensors: AddedSensor[]): void {
        console.log('Added sensors updated:', sensors);
        this.addedSensors = sensors;
    }

    onStep2ValidationChange(isValid: boolean): void {
        this.step2Valid = isValid;
    }

    onStep3ValidationChange(isValid: boolean): void {
        this.step3Valid = isValid;
    }

    onPayloadMetadataChange(mapping: Record<string, PayloadField | undefined>): void {
        this.payloadMetadata = mapping;
    }

    onSensorProfileSelected(profileId: string): void {
        this.sensorProfileId = profileId || null;
    }

    getActiveNodeModelId(): string | undefined {
        if (this.nodeConfig.mode === 'existing') {
            return this.nodeConfig.selectedExistingNode?.idNodeModel;
        }
        return this.nodeConfig.newNode?.nodeModelId;
    }

    onSubmitPairing(payload: any): void {
        console.log('Submitting pairing configuration:', payload);

        // If node was created in step 1, we already have id_node
        // Update unpaired device status with the node ID
        if (this.id_node && this.stepReviewSubmit) {
            this.stepReviewSubmit.updateUnpairedDeviceStatus(this.id_node);
        }

        // TODO: Call API to create sensors and channels
        // For now, just show success message
        alert('Pairing completed successfully!');

        // Navigate back to unpaired devices list
        this.router.navigate(['/iot/unpaired-devices']);
    }

    discardChanges(): void {
        if (confirm('Are you sure you want to discard all changes?')) {
            this.router.navigate(['/iot/unpaired-devices']);
        }
    }
}
