import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export interface ModbusRegister {
  reg: number;
  label: string;
  type: string;
  unit: string;
  scale: number;
  words: number;
  swap: boolean;
  category: string;
  description: string;
}

export interface ChannelsConfig {
  notes?: string;
  version: number;
  baud_rate: number;
  data_format: string;
  description: string;
  device_type: string;
  modbus_address: number;
  scan_interval_ms: number;
  registers: ModbusRegister[];
}

@Component({
  selector: 'app-channels-config-editor',
  templateUrl: './channels-config-editor.component.html',
  styleUrls: ['./channels-config-editor.component.scss'],
  standalone: false
})
export class ChannelsConfigEditorComponent implements OnChanges {
  @Input() config: any;
  @Input() catalogId: string = '';
  @Output() save = new EventEmitter<ChannelsConfig>();
  @Output() saveDisabled = new EventEmitter<void>(); // Emit when RS485 is disabled (set to null)
  @Output() cancel = new EventEmitter<void>();

  // Parsed config
  channelsConfig: ChannelsConfig = this.getDefaultConfig();
  
  // UI State
  isEditing = false;
  isRS485Enabled = false; // Toggle state: true = has config, false = null (no RS485)
  editingRegisterIndex: number | null = null;
  isAddingRegister = false;
  activeTab: 'settings' | 'registers' = 'settings';
  searchTerm = '';
  filterCategory = '';
  
  // Current register being edited/added
  currentRegister: ModbusRegister = this.getEmptyRegister();

  // Options
  dataTypeOptions = ['uint16', 'int16', 'uint32', 'int32', 'float32', 'uint8', 'int8'];
  categoryOptions = ['operating_status', 'analog_input', 'digital_input', 'control', 'config', 'fault', 'test', 'other'];
  baudRateOptions = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
  dataFormatOptions = ['8N1', '8N2', '8E1', '8E2', '8O1', '8O2'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.parseConfig();
    }
  }

  private getDefaultConfig(): ChannelsConfig {
    return {
      notes: '',
      version: 1,
      baud_rate: 9600,
      data_format: '8N1',
      description: '',
      device_type: '',
      modbus_address: 1,
      scan_interval_ms: 1000,
      registers: []
    };
  }

  private getEmptyRegister(): ModbusRegister {
    return {
      reg: 0,
      label: '',
      type: 'uint16',
      unit: '',
      scale: 1,
      words: 1,
      swap: false,
      category: 'operating_status',
      description: ''
    };
  }

  private parseConfig(): void {
    try {
      // Check if config is null/undefined - means RS485 is disabled
      if (!this.config || (typeof this.config === 'object' && Object.keys(this.config).length === 0)) {
        this.isRS485Enabled = false;
        this.channelsConfig = this.getDefaultConfig();
        return;
      }

      // Config exists - RS485 is enabled
      this.isRS485Enabled = true;
      
      if (typeof this.config === 'string') {
        this.channelsConfig = JSON.parse(this.config);
      } else if (this.config && typeof this.config === 'object') {
        this.channelsConfig = { ...this.getDefaultConfig(), ...this.config };
      } else {
        this.channelsConfig = this.getDefaultConfig();
      }
      
      // Ensure registers array exists
      if (!Array.isArray(this.channelsConfig.registers)) {
        this.channelsConfig.registers = [];
      }
    } catch (e) {
      console.error('Error parsing channels config:', e);
      this.isRS485Enabled = false;
      this.channelsConfig = this.getDefaultConfig();
    }
  }

  // Handle RS485 toggle change
  onRS485ToggleChange(): void {
    if (this.isRS485Enabled) {
      // Enabling RS485 - initialize with default config
      this.channelsConfig = this.getDefaultConfig();
    } else {
      // Disabling RS485 - will save as null
      if (confirm('Are you sure you want to disable RS485/Modbus configuration? This will remove all settings.')) {
        this.saveDisabled.emit();
      } else {
        // Revert toggle
        this.isRS485Enabled = true;
      }
    }
  }

  // Get unique categories from registers
  get uniqueCategories(): string[] {
    const categories = new Set<string>();
    this.channelsConfig.registers.forEach(r => {
      if (r.category) categories.add(r.category);
    });
    return Array.from(categories).sort();
  }

  // Filter registers
  get filteredRegisters(): ModbusRegister[] {
    return this.channelsConfig.registers.filter(reg => {
      const matchSearch = !this.searchTerm || 
        reg.label.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        reg.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        reg.reg.toString().includes(this.searchTerm);
      
      const matchCategory = !this.filterCategory || reg.category === this.filterCategory;
      
      return matchSearch && matchCategory;
    });
  }

  // Toggle edit mode
  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.cancelRegisterEdit();
    }
  }

  // Register CRUD
  startAddRegister(): void {
    this.currentRegister = this.getEmptyRegister();
    this.isAddingRegister = true;
    this.editingRegisterIndex = null;
  }

  startEditRegister(index: number): void {
    const actualIndex = this.channelsConfig.registers.indexOf(this.filteredRegisters[index]);
    this.currentRegister = { ...this.channelsConfig.registers[actualIndex] };
    this.editingRegisterIndex = actualIndex;
    this.isAddingRegister = false;
  }

  saveRegister(): void {
    if (!this.validateRegister()) return;

    if (this.isAddingRegister) {
      this.channelsConfig.registers.push({ ...this.currentRegister });
    } else if (this.editingRegisterIndex !== null) {
      this.channelsConfig.registers[this.editingRegisterIndex] = { ...this.currentRegister };
    }

    this.cancelRegisterEdit();
    this.sortRegistersByAddress();
  }

  deleteRegister(index: number): void {
    const actualIndex = this.channelsConfig.registers.indexOf(this.filteredRegisters[index]);
    if (confirm(`Delete register "${this.filteredRegisters[index].label}"?`)) {
      this.channelsConfig.registers.splice(actualIndex, 1);
    }
  }

  cancelRegisterEdit(): void {
    this.currentRegister = this.getEmptyRegister();
    this.editingRegisterIndex = null;
    this.isAddingRegister = false;
  }

  duplicateRegister(index: number): void {
    const reg = this.filteredRegisters[index];
    const newReg = { 
      ...reg, 
      reg: reg.reg + 1,
      label: reg.label + ' (Copy)'
    };
    this.channelsConfig.registers.push(newReg);
    this.sortRegistersByAddress();
  }

  private sortRegistersByAddress(): void {
    this.channelsConfig.registers.sort((a, b) => a.reg - b.reg);
  }

  private validateRegister(): boolean {
    if (!this.currentRegister.label.trim()) {
      alert('Label is required');
      return false;
    }
    if (this.currentRegister.reg < 0) {
      alert('Register address must be >= 0');
      return false;
    }
    return true;
  }

  // Convert register address to hex
  toHex(num: number): string {
    return '0x' + num.toString(16).toUpperCase().padStart(4, '0');
  }

  // Validation errors
  validationErrors: string[] = [];

  // Validate entire config before save
  validateConfig(): boolean {
    this.validationErrors = [];

    // Required fields validation
    if (!this.channelsConfig.device_type?.trim()) {
      this.validationErrors.push('Device Type is required');
    }

    if (!this.channelsConfig.description?.trim()) {
      this.validationErrors.push('Description is required');
    }

    if (!this.channelsConfig.modbus_address || this.channelsConfig.modbus_address < 1 || this.channelsConfig.modbus_address > 247) {
      this.validationErrors.push('Modbus Address must be between 1-247');
    }

    if (!this.channelsConfig.baud_rate || this.channelsConfig.baud_rate <= 0) {
      this.validationErrors.push('Baud Rate is required');
    }

    if (!this.channelsConfig.data_format?.trim()) {
      this.validationErrors.push('Data Format is required');
    }

    if (!this.channelsConfig.scan_interval_ms || this.channelsConfig.scan_interval_ms < 100) {
      this.validationErrors.push('Scan Interval must be at least 100ms');
    }

    // Validate registers
    if (this.channelsConfig.registers.length === 0) {
      this.validationErrors.push('At least one register is required');
    } else {
      this.channelsConfig.registers.forEach((reg, idx) => {
        if (!reg.label?.trim()) {
          this.validationErrors.push(`Register #${idx + 1}: Label is required`);
        }
        if (reg.reg < 0) {
          this.validationErrors.push(`Register #${idx + 1}: Address must be >= 0`);
        }
        if (!reg.type?.trim()) {
          this.validationErrors.push(`Register #${idx + 1}: Type is required`);
        }
        if (!reg.words || reg.words < 1) {
          this.validationErrors.push(`Register #${idx + 1}: Words must be >= 1`);
        }
      });
    }

    // Check for duplicate register addresses
    const regAddresses = this.channelsConfig.registers.map(r => r.reg);
    const duplicates = regAddresses.filter((item, index) => regAddresses.indexOf(item) !== index);
    if (duplicates.length > 0) {
      this.validationErrors.push(`Duplicate register addresses found: ${[...new Set(duplicates)].map(d => this.toHex(d)).join(', ')}`);
    }

    return this.validationErrors.length === 0;
  }

  // Save all changes
  saveConfig(): void {
    // Validate before save
    if (!this.validateConfig()) {
      alert('Validation Failed:\n\n' + this.validationErrors.join('\n'));
      return;
    }

    // Increment version
    this.channelsConfig.version = (this.channelsConfig.version || 0) + 1;
    this.save.emit(this.channelsConfig);
    this.isEditing = false;
    this.validationErrors = [];
  }

  cancelEdit(): void {
    this.parseConfig(); // Reset to original
    this.isEditing = false;
    this.cancel.emit();
  }

  // Export as JSON
  exportJson(): void {
    const json = JSON.stringify(this.channelsConfig, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.channelsConfig.device_type || 'channels-config'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import from JSON
  importJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        this.channelsConfig = { ...this.getDefaultConfig(), ...json };
        if (!Array.isArray(this.channelsConfig.registers)) {
          this.channelsConfig.registers = [];
        }
        alert('Configuration imported successfully!');
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    
    reader.readAsText(file);
    input.value = ''; // Reset input
  }
}
