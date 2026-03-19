import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NodeModelCommandResponseDto, UpdateNodeModelCommandDto } from 'src/sdk/core/models';

interface CommandForm {
    code: string;
    label: string;
    channel: 'sms' | 'mqtt' | 'http' | 'call' | 'telegram';
    template: string;
    config?: Record<string, any>;
    icon: string;
    color: string;
    sortOrder: number;
    isActive: boolean;
}

@Component({
    selector: 'app-node-model-command-drawer',
    templateUrl: './node-model-command-drawer.component.html',
    styleUrls: ['./node-model-command-drawer.component.scss'],
    standalone: false
})
export class NodeModelCommandDrawerComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() mode: 'create' | 'edit' = 'create';
    @Input() existingCommand?: NodeModelCommandResponseDto;
    @Input() channelOptions: Array<{ label: string; value: string }> = [];
    @Output() save = new EventEmitter<any>();
    @Output() close = new EventEmitter<void>();

    formModel: CommandForm = this.createEmptyForm();
    configJson = '{}';
    configError = '';

    iconOptions = [
        { label: 'Terminal', value: 'fa-terminal' },
        { label: 'Power', value: 'fa-power-off' },
        { label: 'Refresh', value: 'fa-refresh' },
        { label: 'Phone', value: 'fa-phone' },
        { label: 'Message', value: 'fa-comment' },
        { label: 'Bell', value: 'fa-bell' },
        { label: 'Cog', value: 'fa-cog' },
        { label: 'Bolt', value: 'fa-bolt' },
        { label: 'Play', value: 'fa-play' },
        { label: 'Stop', value: 'fa-stop' }
    ];

    colorOptions = [
        { label: 'Primary', value: 'primary' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Danger', value: 'danger' },
        { label: 'Info', value: 'info' },
        { label: 'Secondary', value: 'secondary' }
    ];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen'] && this.isOpen) {
            if (this.mode === 'edit' && this.existingCommand) {
                this.formModel = this.mapCommandToForm(this.existingCommand);
                this.configJson = this.existingCommand.config 
                    ? JSON.stringify(this.existingCommand.config, null, 2) 
                    : '{}';
            } else {
                this.formModel = this.createEmptyForm();
                this.configJson = '{}';
            }
            this.configError = '';
        }
    }

    get drawerTitle(): string {
        return this.mode === 'edit' ? 'Edit Command' : 'Add Command';
    }

    get submitButtonLabel(): string {
        return this.mode === 'edit' ? 'Update Command' : 'Save Command';
    }

    handleBackdropClick() {
        this.close.emit();
    }

    handleCloseClick(event: MouseEvent) {
        event.preventDefault();
        this.close.emit();
    }

    validateConfig(): void {
        this.configError = '';
        try {
            JSON.parse(this.configJson);
        } catch (e) {
            this.configError = 'Invalid JSON format';
        }
    }

    handleSubmit(formValid: boolean) {
        if (!formValid) return;
        
        // Validate JSON config
        let config: Record<string, any> | undefined;
        try {
            const parsed = JSON.parse(this.configJson);
            config = Object.keys(parsed).length > 0 ? parsed : undefined;
        } catch (e) {
            this.configError = 'Invalid JSON format';
            return;
        }

        const dto: UpdateNodeModelCommandDto = {
            code: this.formModel.code,
            label: this.formModel.label,
            channel: this.formModel.channel,
            template: this.formModel.template,
            config,
            icon: this.formModel.icon,
            color: this.formModel.color,
            sortOrder: this.formModel.sortOrder,
            isActive: this.formModel.isActive
        };
        
        this.save.emit(dto);
    }

    private createEmptyForm(): CommandForm {
        return {
            code: '',
            label: '',
            channel: 'sms',
            template: '',
            icon: 'fa-terminal',
            color: 'primary',
            sortOrder: 0,
            isActive: true
        };
    }

    private mapCommandToForm(cmd: NodeModelCommandResponseDto): CommandForm {
        return {
            code: cmd.code,
            label: cmd.label,
            channel: cmd.channel as any,
            template: cmd.template,
            icon: cmd.icon || 'fa-terminal',
            color: cmd.color || 'primary',
            sortOrder: cmd.sortOrder || 0,
            isActive: cmd.isActive
        };
    }
}
