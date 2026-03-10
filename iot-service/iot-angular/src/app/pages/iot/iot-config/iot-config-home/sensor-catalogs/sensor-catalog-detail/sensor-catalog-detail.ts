import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SensorCatalogsService } from 'src/sdk/core/services';
import { SensorCatalogResponseDto } from 'src/sdk/core/models';
import { ChannelsConfig } from './channels-config-editor/channels-config-editor.component';

@Component({
  selector: 'app-sensor-catalog-detail',
  templateUrl: './sensor-catalog-detail.html',
  styleUrls: ['./sensor-catalog-detail.scss'],
  standalone: false
})
export class SensorCatalogDetailPage implements OnInit {
  catalog?: SensorCatalogResponseDto;
  loading = false;
  errorMessage = '';
  isDrawerOpen = false;

  // Modbus Register Mapping Prompt Template
  modbusPromptTemplate = `# MODBUS REGISTER MAPPING REQUEST

## KONTEKS SISTEM
Saya menggunakan ESP32 IoT device yang membaca sensor/device via RS485 Modbus RTU.
Config register disimpan dalam format JSON dengan struktur berikut:

{
    "reg": 28713,           // Register address dalam DECIMAL (convert dari hex jika perlu)
    "swap": false,          // true jika device pakai Little Endian / Word Swap
    "type": "uint16",       // Tipe data: uint16, int16, uint32, int32, float32, hex16
    "unit": "Hz",           // Satuan: Hz, V, A, kW, %, °C, m³/h, dll
    "label": "Frequency",   // Nama singkat untuk display
    "scale": 0.01,          // Faktor pengali (raw_value × scale = actual_value)
    "words": 1,             // Jumlah register: 1 untuk 16-bit, 2 untuk 32-bit
    "category": "operating_status",  // Kategori: operating_status, analog_input, energy, dll
    "description": "Operating frequency (U0-00, 0x7000)"  // Deskripsi lengkap + alamat hex
}

## RULES KONVERSI
1. **Hex ke Decimal**: 
   - 0x7000 = 28672
   - 0x100A = 4106
   - 0x0000 = 0
   - Rumus: Setiap digit hex × 16^posisi
   
2. **Words berdasarkan Type**:
   - uint16, int16, hex16 = 1 word
   - uint32, int32, float32 = 2 words

3. **Swap**:
   - Default: false (Big Endian / Standard Modbus)
   - Set true jika: "Little Endian", "Word Swap", "LSB First"

4. **Scale dari Documentation**:
   - "Resolution 0.01" → scale: 0.01
   - "Value × 10" → scale: 0.1
   - "Value / 100" → scale: 0.01
   - Tidak disebutkan → scale: 1

5. **Category Options**:
   - operating_status (frequency, speed, status)
   - voltage, current, power, energy
   - temperature, pressure, flow
   - analog_input, digital_input
   - fault, alarm

## TUGAS
Dari datasheet berikut, generate JSON config LENGKAP dengan format:

{
    "notes": "Catatan penting (setting khusus, dll)",
    "version": 1,
    "baud_rate": 9600,
    "registers": [ ... array of registers ... ],
    "data_format": "8N1",
    "description": "Deskripsi device lengkap",
    "device_type": "Device-Type-Name",
    "modbus_address": 1,
    "scan_interval_ms": 3000
}

---

## DATASHEET DEVICE

[PASTE DATASHEET / REGISTER TABLE DI SINI]

---

## OUTPUT
Berikan JSON yang VALID dan LENGKAP, siap copy-paste ke sistem.
Sertakan semua register yang ada di datasheet.
Tambahkan komentar di "notes" jika ada setting khusus yang perlu dilakukan di device.`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sensorCatalogsService: SensorCatalogsService
  ) {}

  ngOnInit(): void {
    const idSensorCatalog = this.route.snapshot.paramMap.get('id');
    if (idSensorCatalog) {
      this.loadCatalogDetail(idSensorCatalog);
    } else {
      this.router.navigate(['/iot/config/sensor-catalogs']);
    }
  }

  loadCatalogDetail(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerFindOne({ id }).subscribe({
      next: (response: any) => {
        const parsed = typeof response === 'string' ? JSON.parse(response) : response;
        this.catalog = parsed.data || parsed;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sensor catalog:', err);
        this.errorMessage = err.message || 'Failed to load sensor catalog';
        this.loading = false;
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
    if (!this.catalog?.idSensorCatalog) return;

    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerUpdate({
      id: this.catalog.idSensorCatalog,
      body: dto
    }).subscribe({
      next: () => {
        this.loadCatalogDetail(this.catalog!.idSensorCatalog);
        this.closeDrawer();
      },
      error: (err) => {
        console.error('Error updating sensor catalog:', err);
        this.errorMessage = err.message || 'Failed to update sensor catalog';
        this.loading = false;
      }
    });
  }

  // Handle save from Channels Config Editor
  handleChannelsConfigSave(config: ChannelsConfig): void {
    if (!this.catalog?.idSensorCatalog) return;

    this.loading = true;
    this.errorMessage = '';

    // Update only the defaultChannelsJson field
    this.sensorCatalogsService.sensorCatalogsControllerUpdate({
      id: this.catalog.idSensorCatalog,
      body: {
        defaultChannelsJson: config as any
      }
    }).subscribe({
      next: () => {
        this.loadCatalogDetail(this.catalog!.idSensorCatalog);
        alert('Channels configuration saved successfully!');
      },
      error: (err) => {
        console.error('Error saving channels config:', err);
        this.errorMessage = err.message || 'Failed to save channels configuration';
        this.loading = false;
      }
    });
  }

  // Handle disable RS485 config (set to null)
  handleChannelsConfigDisable(): void {
    if (!this.catalog?.idSensorCatalog) return;

    this.loading = true;
    this.errorMessage = '';

    // Set defaultChannelsJson to null
    this.sensorCatalogsService.sensorCatalogsControllerUpdate({
      id: this.catalog.idSensorCatalog,
      body: {
        defaultChannelsJson: null as any
      }
    }).subscribe({
      next: () => {
        this.loadCatalogDetail(this.catalog!.idSensorCatalog);
        alert('RS485/Modbus configuration disabled.');
      },
      error: (err) => {
        console.error('Error disabling channels config:', err);
        this.errorMessage = err.message || 'Failed to disable channels configuration';
        this.loading = false;
      }
    });
  }

  // Initialize empty channels config for catalogs that don't have one
  initChannelsConfig(): void {
    if (!this.catalog?.idSensorCatalog) return;

    const defaultConfig: ChannelsConfig = {
      notes: '',
      version: 1,
      baud_rate: 9600,
      data_format: '8N1',
      description: this.catalog.modelName || 'New Device',
      device_type: this.catalog.modelName?.replace(/\s+/g, '-') || 'device',
      modbus_address: 1,
      scan_interval_ms: 1000,
      registers: []
    };

    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerUpdate({
      id: this.catalog.idSensorCatalog,
      body: {
        defaultChannelsJson: defaultConfig as any
      }
    }).subscribe({
      next: () => {
        this.loadCatalogDetail(this.catalog!.idSensorCatalog);
      },
      error: (err) => {
        console.error('Error initializing channels config:', err);
        this.errorMessage = err.message || 'Failed to initialize channels configuration';
        this.loading = false;
      }
    });
  }

  deleteCatalog(): void {
    if (!this.catalog?.idSensorCatalog) return;

    if (!confirm(`Are you sure you want to delete "${this.catalog.modelName}"?`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.sensorCatalogsService.sensorCatalogsControllerRemove({ id: this.catalog.idSensorCatalog }).subscribe({
      next: () => {
        this.router.navigate(['/iot/config/sensor-catalogs']);
      },
      error: (err) => {
        console.error('Error deleting sensor catalog:', err);
        this.errorMessage = err.message || 'Failed to delete sensor catalog';
        this.loading = false;
      }
    });
  }

  // Copy Modbus Prompt Template to clipboard
  copyPromptTemplate(): void {
    navigator.clipboard.writeText(this.modbusPromptTemplate).then(() => {
      alert('Prompt template copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.modbusPromptTemplate;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Prompt template copied to clipboard!');
    });
  }
}
