import { Component } from '@angular/core';
import { SensorTypeFormValue } from './sensor-type-drawer/sensor-type-drawer.component';

interface SensorType {
  code: string;
  category: string;
  unit: string;
  precision: string;
  description: string;
}

@Component({
  selector: 'app-sensor-types',
  templateUrl: './sensor-types.html',
  styleUrls: ['./sensor-types.scss'],
  standalone: false
})
export class SensorTypesPage {
  search = '';
  isDrawerOpen = false;

  sensorTypes: SensorType[] = [
    // PRESSURE SENSORS
    {
      code: 'PRESSURE_ABSOLUTE',
      category: 'Pressure',
      unit: 'bar',
      precision: '0.01',
      description: 'Tekanan absolut untuk aplikasi vakum dan tekanan tinggi'
    },
    {
      code: 'PRESSURE_GAUGE',
      category: 'Pressure',
      unit: 'bar',
      precision: '0.01',
      description: 'Tekanan gauge relatif terhadap tekanan atmosfer'
    },
    {
      code: 'PRESSURE_DIFFERENTIAL',
      category: 'Pressure',
      unit: 'mbar',
      precision: '0.1',
      description: 'Perbedaan tekanan antar dua titik (filter, pompa)'
    },
    {
      code: 'PRESSURE_HYDROSTATIC',
      category: 'Pressure',
      unit: 'mH2O',
      precision: '0.01',
      description: 'Tekanan hidrostatik untuk pengukuran level berbasis tekanan'
    },

    // FLOW SENSORS
    {
      code: 'FLOW_RATE_VOLUMETRIC',
      category: 'Flow',
      unit: 'm³/h',
      precision: '0.1',
      description: 'Debit volumetrik untuk distribusi air'
    },
    {
      code: 'FLOW_RATE_MASS',
      category: 'Flow',
      unit: 'kg/h',
      precision: '0.1',
      description: 'Debit massa untuk aplikasi presisi tinggi'
    },
    {
      code: 'FLOW_VELOCITY',
      category: 'Flow',
      unit: 'm/s',
      precision: '0.01',
      description: 'Kecepatan aliran dalam pipa'
    },
    {
      code: 'FLOW_TOTALIZER',
      category: 'Flow',
      unit: 'm³',
      precision: '0.001',
      description: 'Total akumulasi volume yang mengalir'
    },

    // LEVEL SENSORS
    {
      code: 'LEVEL_ULTRASONIC',
      category: 'Level',
      unit: 'm',
      precision: '0.001',
      description: 'Level menggunakan sensor ultrasonik non-contact'
    },
    {
      code: 'LEVEL_RADAR',
      category: 'Level',
      unit: 'm',
      precision: '0.001',
      description: 'Level menggunakan radar untuk kondisi ekstrim'
    },
    {
      code: 'LEVEL_PRESSURE',
      category: 'Level',
      unit: 'm',
      precision: '0.01',
      description: 'Level berdasarkan tekanan hidrostatik'
    },
    {
      code: 'LEVEL_FLOAT',
      category: 'Level',
      unit: 'm',
      precision: '0.01',
      description: 'Level menggunakan pelampung mekanik'
    },
    {
      code: 'LEVEL_CAPACITANCE',
      category: 'Level',
      unit: 'm',
      precision: '0.01',
      description: 'Level berdasarkan perubahan kapasitansi'
    },

    // WATER QUALITY - PHYSICAL
    {
      code: 'TURBIDITY',
      category: 'Water Quality',
      unit: 'NTU',
      precision: '0.01',
      description: 'Kekeruhan air untuk monitoring kualitas'
    },
    {
      code: 'TSS',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.1',
      description: 'Total Suspended Solids (padatan tersuspensi)'
    },
    {
      code: 'TDS',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '1',
      description: 'Total Dissolved Solids (padatan terlarut)'
    },
    {
      code: 'CONDUCTIVITY',
      category: 'Water Quality',
      unit: 'μS/cm',
      precision: '0.1',
      description: 'Konduktivitas listrik air'
    },
    {
      code: 'SALINITY',
      category: 'Water Quality',
      unit: 'ppt',
      precision: '0.1',
      description: 'Kadar garam terlarut dalam air'
    },

    // WATER QUALITY - CHEMICAL
    {
      code: 'PH',
      category: 'Water Quality',
      unit: 'pH',
      precision: '0.01',
      description: 'Derajat keasaman air (0-14)'
    },
    {
      code: 'ORP',
      category: 'Water Quality',
      unit: 'mV',
      precision: '1',
      description: 'Oxidation-Reduction Potential'
    },
    {
      code: 'DO',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Dissolved Oxygen (oksigen terlarut)'
    },
    {
      code: 'DO_SATURATION',
      category: 'Water Quality',
      unit: '%',
      precision: '0.1',
      description: 'Persentase saturasi oksigen terlarut'
    },
    {
      code: 'BOD',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.1',
      description: 'Biological Oxygen Demand'
    },
    {
      code: 'COD',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '1',
      description: 'Chemical Oxygen Demand'
    },
    {
      code: 'CHLORINE_FREE',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Klorin bebas untuk disinfeksi'
    },
    {
      code: 'CHLORINE_TOTAL',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Total klorin dalam air'
    },
    {
      code: 'AMMONIA',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Kadar ammonia dalam air'
    },
    {
      code: 'NITRATE',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.1',
      description: 'Kadar nitrat (NO3)'
    },
    {
      code: 'NITRITE',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Kadar nitrit (NO2)'
    },
    {
      code: 'PHOSPHATE',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Kadar fosfat dalam air'
    },
    {
      code: 'HARDNESS_TOTAL',
      category: 'Water Quality',
      unit: 'mg/L CaCO3',
      precision: '1',
      description: 'Total kesadahan air (kalsium + magnesium)'
    },
    {
      code: 'ALKALINITY',
      category: 'Water Quality',
      unit: 'mg/L CaCO3',
      precision: '1',
      description: 'Alkalinitas air'
    },

    // WATER QUALITY - METALS & CONTAMINANTS
    {
      code: 'IRON',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Kadar besi (Fe) dalam air'
    },
    {
      code: 'MANGANESE',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Kadar mangan (Mn) dalam air'
    },
    {
      code: 'FLUORIDE',
      category: 'Water Quality',
      unit: 'mg/L',
      precision: '0.01',
      description: 'Kadar fluorida untuk fluoridasi'
    },
    {
      code: 'ARSENIC',
      category: 'Water Quality',
      unit: 'μg/L',
      precision: '0.1',
      description: 'Kadar arsenik (kontaminan berbahaya)'
    },
    {
      code: 'LEAD',
      category: 'Water Quality',
      unit: 'μg/L',
      precision: '0.1',
      description: 'Kadar timbal dari pipa lama'
    },

    // ENVIRONMENTAL
    {
      code: 'TEMPERATURE_WATER',
      category: 'Environment',
      unit: '°C',
      precision: '0.1',
      description: 'Suhu air dalam pipa/tangki'
    },
    {
      code: 'TEMPERATURE_AMBIENT',
      category: 'Environment',
      unit: '°C',
      precision: '0.1',
      description: 'Suhu udara lingkungan'
    },
    {
      code: 'HUMIDITY',
      category: 'Environment',
      unit: '%RH',
      precision: '0.1',
      description: 'Kelembaban udara relatif'
    },
    {
      code: 'RAINFALL',
      category: 'Environment',
      unit: 'mm',
      precision: '0.1',
      description: 'Curah hujan untuk prediksi debit'
    },
    {
      code: 'WIND_SPEED',
      category: 'Environment',
      unit: 'm/s',
      precision: '0.1',
      description: 'Kecepatan angin'
    },
    {
      code: 'ATMOSPHERIC_PRESSURE',
      category: 'Environment',
      unit: 'mbar',
      precision: '0.1',
      description: 'Tekanan atmosfer'
    },

    // ELECTRICAL & POWER
    {
      code: 'VOLTAGE',
      category: 'Electrical',
      unit: 'V',
      precision: '0.1',
      description: 'Tegangan listrik AC/DC'
    },
    {
      code: 'CURRENT',
      category: 'Electrical',
      unit: 'A',
      precision: '0.01',
      description: 'Arus listrik motor/pompa'
    },
    {
      code: 'POWER_ACTIVE',
      category: 'Electrical',
      unit: 'kW',
      precision: '0.01',
      description: 'Daya aktif yang dikonsumsi'
    },
    {
      code: 'POWER_APPARENT',
      category: 'Electrical',
      unit: 'kVA',
      precision: '0.01',
      description: 'Daya semu (apparent power)'
    },
    {
      code: 'POWER_REACTIVE',
      category: 'Electrical',
      unit: 'kVAR',
      precision: '0.01',
      description: 'Daya reaktif'
    },
    {
      code: 'POWER_FACTOR',
      category: 'Electrical',
      unit: '',
      precision: '0.01',
      description: 'Faktor daya (cos φ)'
    },
    {
      code: 'ENERGY_ACTIVE',
      category: 'Electrical',
      unit: 'kWh',
      precision: '0.01',
      description: 'Total energi aktif terpakai'
    },
    {
      code: 'FREQUENCY',
      category: 'Electrical',
      unit: 'Hz',
      precision: '0.01',
      description: 'Frekuensi listrik (50/60Hz)'
    },

    // PUMP & MOTOR
    {
      code: 'VIBRATION',
      category: 'Mechanical',
      unit: 'mm/s',
      precision: '0.01',
      description: 'Getaran motor/pompa untuk predictive maintenance'
    },
    {
      code: 'MOTOR_TEMPERATURE',
      category: 'Mechanical',
      unit: '°C',
      precision: '0.1',
      description: 'Suhu bearing motor'
    },
    {
      code: 'RPM',
      category: 'Mechanical',
      unit: 'rpm',
      precision: '1',
      description: 'Kecepatan rotasi motor/pompa'
    },
    {
      code: 'TORQUE',
      category: 'Mechanical',
      unit: 'Nm',
      precision: '0.1',
      description: 'Torsi motor'
    },
    {
      code: 'PUMP_EFFICIENCY',
      category: 'Mechanical',
      unit: '%',
      precision: '0.1',
      description: 'Efisiensi pompa hasil kalkulasi'
    },

    // VALVE & ACTUATOR
    {
      code: 'VALVE_POSITION',
      category: 'Actuator',
      unit: '%',
      precision: '0.1',
      description: 'Posisi pembukaan valve (0-100%)'
    },
    {
      code: 'VALVE_FEEDBACK',
      category: 'Actuator',
      unit: '',
      precision: '1',
      description: 'Status feedback valve (open/close/error)'
    },

    // TANK & RESERVOIR
    {
      code: 'VOLUME',
      category: 'Storage',
      unit: 'm³',
      precision: '0.1',
      description: 'Volume air dalam tangki/reservoir'
    },
    {
      code: 'VOLUME_PERCENT',
      category: 'Storage',
      unit: '%',
      precision: '0.1',
      description: 'Persentase kapasitas tangki'
    },

    // LEAK DETECTION
    {
      code: 'LEAK_DETECTION',
      category: 'Safety',
      unit: '',
      precision: '1',
      description: 'Deteksi kebocoran pipa (binary/analog)'
    },
    {
      code: 'ACOUSTIC_LEAK',
      category: 'Safety',
      unit: 'dB',
      precision: '0.1',
      description: 'Deteksi kebocoran akustik'
    },

    // WATER CONSUMPTION
    {
      code: 'CONSUMPTION_HOURLY',
      category: 'Consumption',
      unit: 'm³/h',
      precision: '0.1',
      description: 'Konsumsi air per jam'
    },
    {
      code: 'CONSUMPTION_DAILY',
      category: 'Consumption',
      unit: 'm³',
      precision: '0.1',
      description: 'Total konsumsi harian'
    },
    {
      code: 'CONSUMPTION_MONTHLY',
      category: 'Consumption',
      unit: 'm³',
      precision: '1',
      description: 'Total konsumsi bulanan'
    },

    // NETWORK & SYSTEM
    {
      code: 'SIGNAL_STRENGTH',
      category: 'Network',
      unit: 'dBm',
      precision: '1',
      description: 'Kekuatan sinyal GSM/LoRa/WiFi'
    },
    {
      code: 'BATTERY_VOLTAGE',
      category: 'Power',
      unit: 'V',
      precision: '0.01',
      description: 'Tegangan baterai backup'
    },
    {
      code: 'BATTERY_PERCENT',
      category: 'Power',
      unit: '%',
      precision: '1',
      description: 'Persentase kapasitas baterai'
    },
    {
      code: 'UPTIME',
      category: 'System',
      unit: 'hours',
      precision: '1',
      description: 'Waktu operasi sejak restart terakhir'
    }
  ];

  openCreateDrawer() {
    this.isDrawerOpen = true;
  }

  handleDrawerClose() {
    this.isDrawerOpen = false;
  }

  handleDrawerSave(formValue: SensorTypeFormValue) {
    const newType: SensorType = { ...formValue };
    this.sensorTypes = [newType, ...this.sensorTypes];
    this.isDrawerOpen = false;
  }

  get filteredSensorTypes() {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.sensorTypes;
    }
    return this.sensorTypes.filter((type) =>
      type.code.toLowerCase().includes(term) ||
      type.category.toLowerCase().includes(term) ||
      type.unit.toLowerCase().includes(term)
    );
  }
}
