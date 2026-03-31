import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NodeModelsService, NodeModelCommandsService } from 'src/sdk/core/services';
import { NodeModelResponseDto, NodeModelCommandResponseDto, CreateNodeModelCommandDto } from 'src/sdk/core/models';

@Component({
  selector: 'app-node-model-detail',
  templateUrl: './node-model-detail.html',
  styleUrls: ['./node-model-detail.scss'],
  standalone: false
})
export class NodeModelDetailPage implements OnInit {
  model?: NodeModelResponseDto;
  payloadExample: any;
  loading = false;
  errorMessage = '';
  isDrawerOpen = false;

  // Commands
  commands: NodeModelCommandResponseDto[] = [];
  commandsLoading = false;
  commandsError = '';
  isCommandDrawerOpen = false;
  editingCommand?: NodeModelCommandResponseDto;

  channelOptions = [
    { label: 'SMS', value: 'sms' },
    { label: 'MQTT', value: 'mqtt' },
    { label: 'HTTP', value: 'http' },
    { label: 'Call', value: 'call' },
    { label: 'Telegram', value: 'telegram' }
  ];

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private nodeModelsService: NodeModelsService,
    private commandsService: NodeModelCommandsService
  ) {}

  ngOnInit(): void {
    const idNodeModel = this.route.snapshot.paramMap.get('id');
    if (idNodeModel) {
      this.loadModelDetail(idNodeModel);
      this.loadCommands(idNodeModel);
    } else {
      this.router.navigate(['/iot/config/node-models']);
    }
  }

  loadModelDetail(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.nodeModelsService.nodeModelsControllerFindOne({ id }).subscribe({
      next: (response: any) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.model = parsed.data || parsed;
        if (this.model) {
          this.payloadExample = this.buildPayloadExample(this.model);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading node model:', err);
        this.errorMessage = err.message || 'Failed to load node model';
        this.loading = false;
      }
    });
  }

  // Commands Methods
  loadCommands(idNodeModel: string): void {
    this.commandsLoading = true;
    this.commandsError = '';

    this.commandsService.nodeModelCommandsControllerFindByNodeModel({ idNodeModel }).subscribe({
      next: (response: any) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.commands = Array.isArray(parsed) ? parsed : (parsed.data || []);
        this.commandsLoading = false;
      },
      error: (err) => {
        console.error('Error loading commands:', err);
        this.commandsError = err.message || 'Failed to load commands';
        this.commandsLoading = false;
      }
    });
  }

  openCommandDrawer(command?: NodeModelCommandResponseDto): void {
    this.editingCommand = command;
    this.isCommandDrawerOpen = true;
  }

  closeCommandDrawer(): void {
    this.isCommandDrawerOpen = false;
    this.editingCommand = undefined;
  }

  handleCommandSave(dto: any): void {
    if (!this.model?.idNodeModel) return;

    if (this.editingCommand) {
      // Update existing command
      this.commandsService.nodeModelCommandsControllerUpdate({
        id: this.editingCommand.idCommand,
        body: dto
      }).subscribe({
        next: () => {
          this.loadCommands(this.model!.idNodeModel);
          this.closeCommandDrawer();
        },
        error: (err) => {
          console.error('Error updating command:', err);
          this.commandsError = err.message || 'Failed to update command';
        }
      });
    } else {
      // Create new command
      const createDto: CreateNodeModelCommandDto = {
        ...dto,
        idNodeModel: this.model.idNodeModel
      };
      this.commandsService.nodeModelCommandsControllerCreate({ body: createDto }).subscribe({
        next: () => {
          this.loadCommands(this.model!.idNodeModel);
          this.closeCommandDrawer();
        },
        error: (err) => {
          console.error('Error creating command:', err);
          this.commandsError = err.message || 'Failed to create command';
        }
      });
    }
  }

  deleteCommand(command: NodeModelCommandResponseDto): void {
    if (!confirm(`Delete command "${command.label}"?`)) return;

    this.commandsService.nodeModelCommandsControllerRemove({ id: command.idCommand }).subscribe({
      next: () => {
        this.loadCommands(this.model!.idNodeModel);
      },
      error: (err) => {
        console.error('Error deleting command:', err);
        this.commandsError = err.message || 'Failed to delete command';
      }
    });
  }

  openEditDrawer(): void {
    this.isDrawerOpen = true;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  handleDrawerSave(dto: any): void {
    if (!this.model?.idNodeModel) return;

    this.loading = true;
    this.errorMessage = '';

    this.nodeModelsService.nodeModelsControllerUpdate({
      id: this.model.idNodeModel,
      body: dto
    }).subscribe({
      next: () => {
        this.loadModelDetail(this.model!.idNodeModel);
        this.closeDrawer();
      },
      error: (err) => {
        console.error('Error updating node model:', err);
        this.errorMessage = err.message || 'Failed to update node model';
        this.loading = false;
      }
    });
  }

  deleteModel(): void {
    if (!this.model?.idNodeModel) return;

    if (!confirm(`Are you sure you want to delete "${this.model.modelName}"?`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.nodeModelsService.nodeModelsControllerRemove({ id: this.model.idNodeModel }).subscribe({
      next: () => {
        this.router.navigate(['/iot/config/node-models']);
      },
      error: (err) => {
        console.error('Error deleting node model:', err);
        this.errorMessage = err.message || 'Failed to delete node model';
        this.loading = false;
      }
    });
  }

  private buildPayloadExample(model: NodeModelResponseDto) {
    const base = {
      modelCode: model.modelCode,
      firmwareVersion: model.defaultFirmware || 'v1.0.0',
      deviceSerial: 'SN-XYZ-001',
      timestamp: new Date().toISOString(),
      telemetry: {
        pressure_bar: 2.48,
        flow_m3h: 118.2,
        battery_pct: 82
      },
      signature: 'HMAC-SHA256(payload, secret)' // ilustrasi
    };

    if (model.hardwareClass === 'tracker') {
      return {
        ...base,
        telemetry: {
          lat: -6.2205,
          lng: 106.8472,
          speed_kmh: 42,
          io: {
            ignition: true,
            digital1: false
          }
        }
      };
    }

    return base;
  }
}
