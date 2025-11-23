import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SensorTypeResponseDto } from 'src/sdk/core/models';

export interface SensorTypeFormValue {
  id?: string; // For edit mode
  code: string;
  category: string;
  unit: string;
  precision: string;
  description: string;
  conversionFormula?: string;
}

@Component({
  selector: 'app-sensor-type-drawer',
  templateUrl: './sensor-type-drawer.component.html',
  styleUrls: ['./sensor-type-drawer.component.scss'],
  standalone: false
})
export class SensorTypeDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() editData: SensorTypeResponseDto | null = null; // For edit mode
  @Output() save = new EventEmitter<SensorTypeFormValue>();
  @Output() close = new EventEmitter<void>();

  formModel: SensorTypeFormValue = this.createEmptyForm();
  showAdvanced = false;
  isEditMode = false;

  // Common formula examples for quick reference
  formulaExamples = [
    { label: 'Linear: (x - 0.5) * 2.5', value: '(x - 0.5) * 2.5', description: '0.5-4.5V → 0-10 bar' },
    { label: 'Celsius to Fahrenheit', value: '(x * 9/5) + 32', description: 'C to F conversion' },
    { label: 'Percentage: x * 100', value: 'x * 100', description: '0-1 to 0-100%' },
    { label: 'Square root: Math.sqrt(x)', value: 'Math.sqrt(x)', description: 'For differential pressure flow' },
    { label: 'Logarithmic: Math.log10(x)', value: 'Math.log10(x)', description: 'pH or decibel scales' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      if (this.editData) {
        // Edit mode - populate form with existing data
        this.isEditMode = true;
        this.formModel = {
          id: this.editData.idSensorType,
          code: this.editData.idSensorType.substring(0, 8) + '...', // Display short ID
          category: this.editData.category,
          unit: this.editData.defaultUnit || '',
          precision: this.editData.precision?.toString() || '',
          description: '', // Not available in DTO
          conversionFormula: this.editData.conversionFormula || ''
        };
        this.showAdvanced = !!this.editData.conversionFormula; // Auto-expand if formula exists
      } else {
        // Create mode - reset form
        this.isEditMode = false;
        this.formModel = this.createEmptyForm();
        this.showAdvanced = false;
      }
    }
  }

  handleBackdropClick() {
    this.close.emit();
  }

  handleCloseClick(event: MouseEvent) {
    event.preventDefault();
    this.close.emit();
  }

  handleSubmit(formValid: boolean) {
    if (!formValid) {
      return;
    }
    this.save.emit({ ...this.formModel });
  }

  useFormulaExample(example: string) {
    this.formModel.conversionFormula = example;
  }

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
  }

  validateFormula(): string | null {
    if (!this.formModel.conversionFormula?.trim()) {
      return null; // Optional field, no error if empty
    }

    const formula = this.formModel.conversionFormula.trim();

    // Check for dangerous patterns
    const dangerousPatterns = [
      /require\(/i,
      /import\(/i,
      /eval\(/i,
      /Function\(/i,
      /process\./i,
      /fs\./i,
      /child_process/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        return 'Formula contains prohibited functions';
      }
    }

    // Check if 'x' variable is used
    if (!formula.includes('x')) {
      return 'Formula must use "x" as the raw value variable';
    }

    // Try to validate syntax by testing with sample value
    try {
      const testFunc = new Function('x', 'Math', `return ${formula}`);
      const result = testFunc(1.0, Math);
      
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return 'Formula must return a valid number';
      }
    } catch (error) {
      return 'Invalid formula syntax: ' + (error as Error).message;
    }

    return null; // Valid
  }

  get formulaError(): string | null {
    return this.validateFormula();
  }

  private createEmptyForm(): SensorTypeFormValue {
    return {
      code: '',
      category: '',
      unit: '',
      precision: '',
      description: '',
      conversionFormula: ''
    };
  }
}
