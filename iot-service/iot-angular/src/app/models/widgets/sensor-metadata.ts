import { SensorType, SensorCategory } from './widget-types.enum';

export interface SensorMetadata {
  type: SensorType;
  displayName: string;
  defaultUnit: string;
  icon: string;
  iconColor: string;
  defaultMin: number;
  defaultMax: number;
  precision: number;
  category: SensorCategory;
}

export const SENSOR_METADATA: Record<SensorType, SensorMetadata> = {
  // Flow & Volume
  flow_rate: {
    type: 'flow_rate',
    displayName: 'Flow Rate',
    defaultUnit: 'm3/h',
    icon: 'fa-water',
    iconColor: '#3B82F6',
    defaultMin: 0,
    defaultMax: 500,
    precision: 0.1,
    category: 'flow'
  },
  flow_totalizer: {
    type: 'flow_totalizer',
    displayName: 'Total Flow',
    defaultUnit: 'm3',
    icon: 'fa-gauge-high',
    iconColor: '#3B82F6',
    defaultMin: 0,
    defaultMax: 10000,
    precision: 0.01,
    category: 'flow'
  },
  velocity: {
    type: 'velocity',
    displayName: 'Velocity',
    defaultUnit: 'm/s',
    icon: 'fa-wind',
    iconColor: '#06B6D4',
    defaultMin: 0,
    defaultMax: 50,
    precision: 0.01,
    category: 'flow'
  },

  // Pressure
  pressure: {
    type: 'pressure',
    displayName: 'Pressure',
    defaultUnit: 'bar',
    icon: 'fa-gauge',
    iconColor: '#0EA5E9',
    defaultMin: 0,
    defaultMax: 10,
    precision: 0.01,
    category: 'pressure'
  },
  pressure_differential: {
    type: 'pressure_differential',
    displayName: 'Differential Pressure',
    defaultUnit: 'bar',
    icon: 'fa-arrows-left-right',
    iconColor: '#0EA5E9',
    defaultMin: -5,
    defaultMax: 5,
    precision: 0.01,
    category: 'pressure'
  },
  pressure_vacuum: {
    type: 'pressure_vacuum',
    displayName: 'Vacuum Pressure',
    defaultUnit: 'mbar',
    icon: 'fa-vacuum',
    iconColor: '#0EA5E9',
    defaultMin: -1000,
    defaultMax: 0,
    precision: 0.1,
    category: 'pressure'
  },
  pressure_atmospheric: {
    type: 'pressure_atmospheric',
    displayName: 'Atmospheric Pressure',
    defaultUnit: 'hPa',
    icon: 'fa-cloud',
    iconColor: '#0EA5E9',
    defaultMin: 950,
    defaultMax: 1050,
    precision: 0.1,
    category: 'environmental'
  },

  // Level & Distance
  level: {
    type: 'level',
    displayName: 'Level',
    defaultUnit: 'm',
    icon: 'fa-chart-bar',
    iconColor: '#10B981',
    defaultMin: 0,
    defaultMax: 10,
    precision: 0.01,
    category: 'flow'
  },
  distance: {
    type: 'distance',
    displayName: 'Distance',
    defaultUnit: 'm',
    icon: 'fa-ruler',
    iconColor: '#10B981',
    defaultMin: 0,
    defaultMax: 100,
    precision: 0.01,
    category: 'flow'
  },
  depth: {
    type: 'depth',
    displayName: 'Depth',
    defaultUnit: 'm',
    icon: 'fa-water',
    iconColor: '#10B981',
    defaultMin: 0,
    defaultMax: 50,
    precision: 0.01,
    category: 'flow'
  },

  // Temperature
  temperature: {
    type: 'temperature',
    displayName: 'Temperature',
    defaultUnit: '°C',
    icon: 'fa-thermometer',
    iconColor: '#EF4444',
    defaultMin: -50,
    defaultMax: 150,
    precision: 0.1,
    category: 'temperature'
  },
  temperature_ambient: {
    type: 'temperature_ambient',
    displayName: 'Ambient Temperature',
    defaultUnit: '°C',
    icon: 'fa-thermometer-half',
    iconColor: '#F97316',
    defaultMin: -20,
    defaultMax: 50,
    precision: 0.1,
    category: 'temperature'
  },
  temperature_differential: {
    type: 'temperature_differential',
    displayName: 'Temperature Differential',
    defaultUnit: '°C',
    icon: 'fa-temperature-arrow-up',
    iconColor: '#EF4444',
    defaultMin: -50,
    defaultMax: 50,
    precision: 0.1,
    category: 'temperature'
  },

  // Electrical
  voltage: {
    type: 'voltage',
    displayName: 'Voltage',
    defaultUnit: 'V',
    icon: 'fa-bolt',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 500,
    precision: 0.1,
    category: 'electrical'
  },
  current: {
    type: 'current',
    displayName: 'Current',
    defaultUnit: 'A',
    icon: 'fa-bolt',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 100,
    precision: 0.01,
    category: 'electrical'
  },
  power_active: {
    type: 'power_active',
    displayName: 'Active Power',
    defaultUnit: 'kW',
    icon: 'fa-plug',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 1000,
    precision: 0.1,
    category: 'electrical'
  },
  power_reactive: {
    type: 'power_reactive',
    displayName: 'Reactive Power',
    defaultUnit: 'kVAR',
    icon: 'fa-plug',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 1000,
    precision: 0.1,
    category: 'electrical'
  },
  power_factor: {
    type: 'power_factor',
    displayName: 'Power Factor',
    defaultUnit: 'cos φ',
    icon: 'fa-percent',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 1,
    precision: 0.001,
    category: 'electrical'
  },
  energy: {
    type: 'energy',
    displayName: 'Energy',
    defaultUnit: 'kWh',
    icon: 'fa-battery-full',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 10000,
    precision: 0.01,
    category: 'electrical'
  },
  frequency: {
    type: 'frequency',
    displayName: 'Frequency',
    defaultUnit: 'Hz',
    icon: 'fa-wave-square',
    iconColor: '#F59E0B',
    defaultMin: 45,
    defaultMax: 65,
    precision: 0.01,
    category: 'electrical'
  },

  // Water Quality
  ph: {
    type: 'ph',
    displayName: 'pH',
    defaultUnit: 'pH',
    icon: 'fa-flask',
    iconColor: '#8B5CF6',
    defaultMin: 0,
    defaultMax: 14,
    precision: 0.01,
    category: 'quality'
  },
  conductivity: {
    type: 'conductivity',
    displayName: 'Conductivity',
    defaultUnit: 'μS/cm',
    icon: 'fa-droplet',
    iconColor: '#8B5CF6',
    defaultMin: 0,
    defaultMax: 5000,
    precision: 0.1,
    category: 'quality'
  },
  tds: {
    type: 'tds',
    displayName: 'TDS',
    defaultUnit: 'ppm',
    icon: 'fa-microscope',
    iconColor: '#8B5CF6',
    defaultMin: 0,
    defaultMax: 2000,
    precision: 1,
    category: 'quality'
  },
  turbidity: {
    type: 'turbidity',
    displayName: 'Turbidity',
    defaultUnit: 'NTU',
    icon: 'fa-eye-dropper',
    iconColor: '#8B5CF6',
    defaultMin: 0,
    defaultMax: 100,
    precision: 0.1,
    category: 'quality'
  },
  dissolved_oxygen: {
    type: 'dissolved_oxygen',
    displayName: 'Dissolved Oxygen',
    defaultUnit: 'mg/L',
    icon: 'fa-wind',
    iconColor: '#8B5CF6',
    defaultMin: 0,
    defaultMax: 20,
    precision: 0.01,
    category: 'quality'
  },
  chlorine: {
    type: 'chlorine',
    displayName: 'Chlorine',
    defaultUnit: 'mg/L',
    icon: 'fa-vial',
    iconColor: '#8B5CF6',
    defaultMin: 0,
    defaultMax: 10,
    precision: 0.01,
    category: 'quality'
  },
  orp: {
    type: 'orp',
    displayName: 'ORP',
    defaultUnit: 'mV',
    icon: 'fa-circle-radiation',
    iconColor: '#8B5CF6',
    defaultMin: -1000,
    defaultMax: 1000,
    precision: 1,
    category: 'quality'
  },

  // Environmental
  humidity: {
    type: 'humidity',
    displayName: 'Humidity',
    defaultUnit: '%RH',
    icon: 'fa-droplet-percent',
    iconColor: '#06B6D4',
    defaultMin: 0,
    defaultMax: 100,
    precision: 0.1,
    category: 'environmental'
  },
  light_intensity: {
    type: 'light_intensity',
    displayName: 'Light Intensity',
    defaultUnit: 'lux',
    icon: 'fa-lightbulb',
    iconColor: '#FBBF24',
    defaultMin: 0,
    defaultMax: 100000,
    precision: 1,
    category: 'environmental'
  },
  uv_index: {
    type: 'uv_index',
    displayName: 'UV Index',
    defaultUnit: 'index',
    icon: 'fa-sun',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 15,
    precision: 0.1,
    category: 'environmental'
  },
  rainfall: {
    type: 'rainfall',
    displayName: 'Rainfall',
    defaultUnit: 'mm',
    icon: 'fa-cloud-rain',
    iconColor: '#3B82F6',
    defaultMin: 0,
    defaultMax: 500,
    precision: 0.1,
    category: 'environmental'
  },
  wind_speed: {
    type: 'wind_speed',
    displayName: 'Wind Speed',
    defaultUnit: 'm/s',
    icon: 'fa-wind',
    iconColor: '#06B6D4',
    defaultMin: 0,
    defaultMax: 50,
    precision: 0.1,
    category: 'environmental'
  },
  wind_direction: {
    type: 'wind_direction',
    displayName: 'Wind Direction',
    defaultUnit: 'degree',
    icon: 'fa-compass',
    iconColor: '#06B6D4',
    defaultMin: 0,
    defaultMax: 360,
    precision: 1,
    category: 'environmental'
  },

  // Gas & Air Quality
  gas_co2: {
    type: 'gas_co2',
    displayName: 'CO2',
    defaultUnit: 'ppm',
    icon: 'fa-smog',
    iconColor: '#64748B',
    defaultMin: 0,
    defaultMax: 5000,
    precision: 1,
    category: 'gas'
  },
  gas_co: {
    type: 'gas_co',
    displayName: 'CO',
    defaultUnit: 'ppm',
    icon: 'fa-skull-crossbones',
    iconColor: '#64748B',
    defaultMin: 0,
    defaultMax: 1000,
    precision: 0.1,
    category: 'gas'
  },
  gas_o2: {
    type: 'gas_o2',
    displayName: 'O2',
    defaultUnit: '%',
    icon: 'fa-lungs',
    iconColor: '#10B981',
    defaultMin: 0,
    defaultMax: 25,
    precision: 0.01,
    category: 'gas'
  },
  gas_ch4: {
    type: 'gas_ch4',
    displayName: 'CH4 (Methane)',
    defaultUnit: 'ppm',
    icon: 'fa-fire',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 10000,
    precision: 1,
    category: 'gas'
  },
  gas_nh3: {
    type: 'gas_nh3',
    displayName: 'NH3 (Ammonia)',
    defaultUnit: 'ppm',
    icon: 'fa-biohazard',
    iconColor: '#EF4444',
    defaultMin: 0,
    defaultMax: 500,
    precision: 0.1,
    category: 'gas'
  },
  gas_h2s: {
    type: 'gas_h2s',
    displayName: 'H2S',
    defaultUnit: 'ppm',
    icon: 'fa-skull',
    iconColor: '#EF4444',
    defaultMin: 0,
    defaultMax: 100,
    precision: 0.1,
    category: 'gas'
  },
  gas_voc: {
    type: 'gas_voc',
    displayName: 'VOC',
    defaultUnit: 'ppb',
    icon: 'fa-spray-can',
    iconColor: '#8B5CF6',
    defaultMin: 0,
    defaultMax: 10000,
    precision: 1,
    category: 'gas'
  },
  pm25: {
    type: 'pm25',
    displayName: 'PM2.5',
    defaultUnit: 'μg/m3',
    icon: 'fa-cloud',
    iconColor: '#64748B',
    defaultMin: 0,
    defaultMax: 500,
    precision: 1,
    category: 'gas'
  },
  pm10: {
    type: 'pm10',
    displayName: 'PM10',
    defaultUnit: 'μg/m3',
    icon: 'fa-cloud',
    iconColor: '#64748B',
    defaultMin: 0,
    defaultMax: 600,
    precision: 1,
    category: 'gas'
  },

  // Motion & Position
  vibration: {
    type: 'vibration',
    displayName: 'Vibration',
    defaultUnit: 'mm/s',
    icon: 'fa-wave-pulse',
    iconColor: '#EC4899',
    defaultMin: 0,
    defaultMax: 50,
    precision: 0.001,
    category: 'motion'
  },
  acceleration: {
    type: 'acceleration',
    displayName: 'Acceleration',
    defaultUnit: 'g',
    icon: 'fa-rocket',
    iconColor: '#EC4899',
    defaultMin: -10,
    defaultMax: 10,
    precision: 0.001,
    category: 'motion'
  },
  tilt: {
    type: 'tilt',
    displayName: 'Tilt',
    defaultUnit: 'degree',
    icon: 'fa-angle-right',
    iconColor: '#EC4899',
    defaultMin: -180,
    defaultMax: 180,
    precision: 0.1,
    category: 'motion'
  },
  gps_latitude: {
    type: 'gps_latitude',
    displayName: 'GPS Latitude',
    defaultUnit: 'degree',
    icon: 'fa-location-dot',
    iconColor: '#EF4444',
    defaultMin: -90,
    defaultMax: 90,
    precision: 0.000001,
    category: 'motion'
  },
  gps_longitude: {
    type: 'gps_longitude',
    displayName: 'GPS Longitude',
    defaultUnit: 'degree',
    icon: 'fa-location-dot',
    iconColor: '#EF4444',
    defaultMin: -180,
    defaultMax: 180,
    precision: 0.000001,
    category: 'motion'
  },
  gps_altitude: {
    type: 'gps_altitude',
    displayName: 'GPS Altitude',
    defaultUnit: 'm',
    icon: 'fa-mountain',
    iconColor: '#10B981',
    defaultMin: -500,
    defaultMax: 9000,
    precision: 0.1,
    category: 'motion'
  },

  // Status & Digital
  digital_input: {
    type: 'digital_input',
    displayName: 'Digital Input',
    defaultUnit: 'boolean',
    icon: 'fa-toggle-on',
    iconColor: '#6366F1',
    defaultMin: 0,
    defaultMax: 1,
    precision: 1,
    category: 'status'
  },
  pulse_count: {
    type: 'pulse_count',
    displayName: 'Pulse Count',
    defaultUnit: 'count',
    icon: 'fa-hashtag',
    iconColor: '#6366F1',
    defaultMin: 0,
    defaultMax: 1000000,
    precision: 1,
    category: 'status'
  },
  battery_level: {
    type: 'battery_level',
    displayName: 'Battery Level',
    defaultUnit: '%',
    icon: 'fa-battery-three-quarters',
    iconColor: '#10B981',
    defaultMin: 0,
    defaultMax: 100,
    precision: 0.1,
    category: 'status'
  },
  signal_rssi: {
    type: 'signal_rssi',
    displayName: 'Signal RSSI',
    defaultUnit: 'dBm',
    icon: 'fa-signal',
    iconColor: '#6366F1',
    defaultMin: -120,
    defaultMax: 0,
    precision: 1,
    category: 'status'
  },
  signal_quality: {
    type: 'signal_quality',
    displayName: 'Signal Quality',
    defaultUnit: '%',
    icon: 'fa-wifi',
    iconColor: '#6366F1',
    defaultMin: 0,
    defaultMax: 100,
    precision: 1,
    category: 'status'
  },

  // Industrial
  rpm: {
    type: 'rpm',
    displayName: 'RPM',
    defaultUnit: 'rpm',
    icon: 'fa-gear',
    iconColor: '#64748B',
    defaultMin: 0,
    defaultMax: 10000,
    precision: 1,
    category: 'industrial'
  },
  torque: {
    type: 'torque',
    displayName: 'Torque',
    defaultUnit: 'Nm',
    icon: 'fa-wrench',
    iconColor: '#64748B',
    defaultMin: 0,
    defaultMax: 1000,
    precision: 0.01,
    category: 'industrial'
  },
  force: {
    type: 'force',
    displayName: 'Force',
    defaultUnit: 'N',
    icon: 'fa-hand-fist',
    iconColor: '#64748B',
    defaultMin: 0,
    defaultMax: 10000,
    precision: 0.1,
    category: 'industrial'
  },
  sound_level: {
    type: 'sound_level',
    displayName: 'Sound Level',
    defaultUnit: 'dB',
    icon: 'fa-volume-high',
    iconColor: '#F59E0B',
    defaultMin: 0,
    defaultMax: 140,
    precision: 0.1,
    category: 'industrial'
  },
  radiation: {
    type: 'radiation',
    displayName: 'Radiation',
    defaultUnit: 'μSv/h',
    icon: 'fa-radiation',
    iconColor: '#EF4444',
    defaultMin: 0,
    defaultMax: 100,
    precision: 0.001,
    category: 'industrial'
  }
};
