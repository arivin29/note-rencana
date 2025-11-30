import { Component, Input, OnInit } from '@angular/core';
import { DeviceCommandsService } from '../../../../../../sdk/core/services/device-commands.service';
import { SendRelayCommandDto } from '../../../../../../sdk/core/models/send-relay-command-dto';
import { CommandResponseDto } from '../../../../../../sdk/core/models/command-response-dto';

interface RelayState {
    out1: 'on' | 'off' | 'unknown';
    out2: 'on' | 'off' | 'unknown';
}

interface CommandHistory {
    timestamp: Date;
    target: 'out1' | 'out2';
    action: string;
    success: boolean;
    message: string;
}

@Component({
    selector: 'app-node-relay-control',
    templateUrl: './node-relay-control.component.html',
    styleUrls: ['./node-relay-control.component.scss'],
    standalone: false
})
export class NodeRelayControlComponent implements OnInit {
    @Input() deviceId!: string; // Node MAC address or hardware ID
    @Input() nodeCode!: string; // Node code for display

    mqttConnected = false;
    loading = false;
    relayState: RelayState = {
        out1: 'unknown',
        out2: 'unknown'
    };
    
    commandHistory: CommandHistory[] = [];
    
    // Pulse duration in seconds
    pulseDuration = 5;

    constructor(private deviceCommandsService: DeviceCommandsService) {}

    ngOnInit(): void {
        this.checkMqttStatus();
        // Load command history from localStorage
        this.loadCommandHistory();
    }

    checkMqttStatus(): void {
        this.deviceCommandsService.deviceCommandsControllerGetMqttStatus$Response().subscribe({
            next: (response) => {
                const status: any = response.body;
                this.mqttConnected = status.connected || false;
            },
            error: (err) => {
                console.error('Failed to check MQTT status:', err);
                this.mqttConnected = false;
            }
        });
    }

    sendRelayCommand(target: 'out1' | 'out2', action: 'on' | 'off' | 'pulse'): void {
        if (!this.deviceId) {
            alert('Device ID is not available');
            return;
        }

        if (!this.mqttConnected) {
            alert('MQTT is not connected. Please check backend connection.');
            return;
        }

        this.loading = true;

        const command: SendRelayCommandDto = {
            deviceId: this.deviceId,
            action: action,
            target: target
        };

        // Add duration for pulse action
        if (action === 'pulse') {
            command.duration = this.pulseDuration * 1000; // Convert to milliseconds
        }

        this.deviceCommandsService.deviceCommandsControllerSendRelayCommand$Response({
            body: command
        }).subscribe({
            next: (response) => {
                const result = response.body as CommandResponseDto;
                this.loading = false;

                // Update relay state (optimistic update)
                if (action === 'on') {
                    this.relayState[target] = 'on';
                } else if (action === 'off') {
                    this.relayState[target] = 'off';
                } else if (action === 'pulse') {
                    // Pulse: ON briefly, then OFF
                    this.relayState[target] = 'on';
                    setTimeout(() => {
                        this.relayState[target] = 'off';
                    }, this.pulseDuration * 1000);
                }

                // Add to history
                this.addToHistory({
                    timestamp: new Date(),
                    target: target,
                    action: action,
                    success: true,
                    message: result.message || 'Command sent successfully'
                });

                // Show success notification
                this.showNotification('success', `${action.toUpperCase()} command sent to ${target.toUpperCase()}`);
            },
            error: (err) => {
                console.error('Failed to send relay command:', err);
                this.loading = false;

                // Add to history
                this.addToHistory({
                    timestamp: new Date(),
                    target: target,
                    action: action,
                    success: false,
                    message: err.error?.message || 'Failed to send command'
                });

                // Show error notification
                this.showNotification('error', `Failed to send command: ${err.error?.message || 'Unknown error'}`);
            }
        });
    }

    turnOn(target: 'out1' | 'out2'): void {
        const confirmMsg = `Turn ON relay ${target.toUpperCase()}?\n\nThis will activate the connected device continuously.`;
        if (confirm(confirmMsg)) {
            this.sendRelayCommand(target, 'on');
        }
    }

    turnOff(target: 'out1' | 'out2'): void {
        const confirmMsg = `Turn OFF relay ${target.toUpperCase()}?\n\nThis will deactivate the connected device.`;
        if (confirm(confirmMsg)) {
            this.sendRelayCommand(target, 'off');
        }
    }

    pulse(target: 'out1' | 'out2'): void {
        const confirmMsg = `PULSE relay ${target.toUpperCase()} for ${this.pulseDuration} seconds?\n\nRelay will turn ON briefly, then automatically turn OFF.`;
        if (confirm(confirmMsg)) {
            this.sendRelayCommand(target, 'pulse');
        }
    }

    addToHistory(entry: CommandHistory): void {
        this.commandHistory.unshift(entry);
        // Keep only last 10 entries
        if (this.commandHistory.length > 10) {
            this.commandHistory = this.commandHistory.slice(0, 10);
        }
        // Save to localStorage
        this.saveCommandHistory();
    }

    loadCommandHistory(): void {
        const stored = localStorage.getItem(`relay_history_${this.deviceId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.commandHistory = parsed.map((item: any) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
            } catch (e) {
                console.error('Failed to parse command history:', e);
            }
        }
    }

    saveCommandHistory(): void {
        try {
            localStorage.setItem(`relay_history_${this.deviceId}`, JSON.stringify(this.commandHistory));
        } catch (e) {
            console.error('Failed to save command history:', e);
        }
    }

    clearHistory(): void {
        if (confirm('Clear all command history?')) {
            this.commandHistory = [];
            localStorage.removeItem(`relay_history_${this.deviceId}`);
        }
    }

    showNotification(type: 'success' | 'error', message: string): void {
        // Simple notification - you can replace with your UI library's notification
        const color = type === 'success' ? 'green' : 'red';
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${color};
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    getRelayStateClass(target: 'out1' | 'out2'): string {
        const state = this.relayState[target];
        if (state === 'on') return 'bg-success';
        if (state === 'off') return 'bg-secondary';
        return 'bg-light text-dark';
    }

    getRelayStateIcon(target: 'out1' | 'out2'): string {
        const state = this.relayState[target];
        if (state === 'on') return 'bi bi-power text-white';
        if (state === 'off') return 'bi bi-dash-circle text-white';
        return 'bi bi-question-circle';
    }
}
