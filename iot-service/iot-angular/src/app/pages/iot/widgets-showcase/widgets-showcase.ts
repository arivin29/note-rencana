import { Component, OnInit } from '@angular/core';
import {
  BaseWidgetConfig,
  GaugeWidgetConfig,
  InfoCardWidgetConfig
} from '../../../models/widgets';
import { WidgetFactoryService } from '../../../components/widgets/services/widget-factory.service';

@Component({
  selector: 'widgets-showcase',
  templateUrl: './widgets-showcase.html',
  styleUrls: ['./widgets-showcase.scss'],
  standalone: false
})
export class WidgetsShowcasePage implements OnInit {
  
  // Filter category
  filterCategory: 'all' | 'pressure' | 'temperature' | 'flow' | 'level' | 'power' | 'environment' = 'all';
  
  // Pressure Sensors
  pressureGauge!: GaugeWidgetConfig;
  pressureBigNumber!: BaseWidgetConfig;
  pressureInfoCard!: InfoCardWidgetConfig;

  // Temperature Sensors
  temperatureBigNumber!: BaseWidgetConfig;
  temperatureGauge!: GaugeWidgetConfig;
  temperatureInfoCard!: InfoCardWidgetConfig;

  // Flow Sensors
  flowInfoCard!: InfoCardWidgetConfig;
  flowBigNumber!: BaseWidgetConfig;
  flowGauge!: GaugeWidgetConfig;

  // Level Sensors
  levelBigNumber!: BaseWidgetConfig;
  levelGauge!: GaugeWidgetConfig;
  levelInfoCard!: InfoCardWidgetConfig;

  // Power & Electrical Sensors
  voltageGauge!: GaugeWidgetConfig;
  voltageBigNumber!: BaseWidgetConfig;
  currentInfoCard!: InfoCardWidgetConfig;
  powerBigNumber!: BaseWidgetConfig;

  // Environmental Sensors
  humidityInfoCard!: InfoCardWidgetConfig;
  humidityGauge!: GaugeWidgetConfig;
  co2BigNumber!: BaseWidgetConfig;
  phInfoCard!: InfoCardWidgetConfig;

  constructor(private widgetFactory: WidgetFactoryService) {}

  ngOnInit() {
    this.initDemoWidgets();
  }

  private initDemoWidgets() {
    // ========== PRESSURE SENSORS ==========
    this.pressureGauge = this.widgetFactory.createGaugeWidget(
      'pressure',
      2.4,
      {
        label: 'Inlet Pressure',
        max: 5,
        updateTime: '2s ago'
      }
    );

    this.pressureBigNumber = this.widgetFactory.createWidget(
      'big-number',
      'pressure',
      3.8,
      {
        label: 'Outlet Pressure',
        updateTime: '3s ago'
      }
    );

    this.pressureInfoCard = this.widgetFactory.createInfoCardWidget(
      'pressure',
      2.1,
      {
        label: 'Tank Pressure',
        trend: {
          direction: 'stable',
          value: 0
        },
        stats: {
          min: 1.8,
          max: 2.5
        },
        updateTime: '5s ago'
      }
    );

    // ========== TEMPERATURE SENSORS ==========
    this.temperatureBigNumber = this.widgetFactory.createWidget(
      'big-number',
      'temperature',
      27.5,
      {
        label: 'Ambient Temperature',
        updateTime: '5s ago'
      }
    );

    this.temperatureGauge = this.widgetFactory.createGaugeWidget(
      'temperature',
      82.3,
      {
        label: 'Engine Temperature',
        max: 120,
        updateTime: '1s ago'
      }
    );

    this.temperatureInfoCard = this.widgetFactory.createInfoCardWidget(
      'temperature',
      45.8,
      {
        label: 'Room Temperature',
        trend: {
          direction: 'up',
          value: 1.2
        },
        stats: {
          min: 22.5,
          max: 48.0
        },
        updateTime: '4s ago'
      }
    );

    // ========== FLOW SENSORS ==========
    this.flowInfoCard = this.widgetFactory.createInfoCardWidget(
      'flow_rate',
      118.2,
      {
        label: 'Main Flow Meter',
        trend: {
          direction: 'up',
          value: 5.2
        },
        stats: {
          min: 95.5,
          max: 125.8
        },
        updateTime: '3s ago'
      }
    );

    this.flowBigNumber = this.widgetFactory.createWidget(
      'big-number',
      'flow_rate',
      85.7,
      {
        label: 'Bypass Flow',
        updateTime: '2s ago'
      }
    );

    this.flowGauge = this.widgetFactory.createGaugeWidget(
      'flow_rate',
      142.5,
      {
        label: 'Total Flow',
        max: 200,
        updateTime: '1s ago'
      }
    );

    // ========== LEVEL SENSORS ==========
    this.levelBigNumber = this.widgetFactory.createWidget(
      'big-number',
      'level',
      3.45,
      {
        label: 'Tank A Level',
        updateTime: '10s ago',
        status: 'warning'
      }
    );

    this.levelGauge = this.widgetFactory.createGaugeWidget(
      'level',
      7.2,
      {
        label: 'Reservoir Level',
        max: 10,
        updateTime: '5s ago'
      }
    );

    this.levelInfoCard = this.widgetFactory.createInfoCardWidget(
      'level',
      2.1,
      {
        label: 'Tank B Level',
        trend: {
          direction: 'down',
          value: 0.3
        },
        stats: {
          min: 0.5,
          max: 5.0
        },
        updateTime: '8s ago'
      }
    );

    // ========== POWER & ELECTRICAL SENSORS ==========
    this.voltageGauge = this.widgetFactory.createGaugeWidget(
      'voltage',
      223,
      {
        label: 'Line Voltage',
        max: 250,
        updateTime: '1s ago'
      }
    );

    this.voltageBigNumber = this.widgetFactory.createWidget(
      'big-number',
      'voltage',
      12.4,
      {
        label: 'DC Voltage',
        updateTime: '2s ago'
      }
    );

    this.currentInfoCard = this.widgetFactory.createInfoCardWidget(
      'current',
      15.8,
      {
        label: 'Line Current',
        trend: {
          direction: 'up',
          value: 1.5
        },
        stats: {
          min: 10.2,
          max: 18.5
        },
        updateTime: '3s ago'
      }
    );

    this.powerBigNumber = this.widgetFactory.createWidget(
      'big-number',
      'power_factor',
      3524,
      {
        label: 'Total Power (kW)',
        updateTime: '1s ago'
      }
    );

    // ========== ENVIRONMENTAL SENSORS ==========
    this.humidityInfoCard = this.widgetFactory.createInfoCardWidget(
      'humidity',
      65.5,
      {
        label: 'Ambient Humidity',
        trend: {
          direction: 'down',
          value: 2.1
        },
        stats: {
          min: 55.0,
          max: 75.0
        },
        updateTime: '8s ago'
      }
    );

    this.humidityGauge = this.widgetFactory.createGaugeWidget(
      'humidity',
      78.3,
      {
        label: 'Room Humidity',
        max: 100,
        updateTime: '5s ago'
      }
    );

    this.co2BigNumber = this.widgetFactory.createWidget(
      'big-number',
      'gas_co2',
      420,
      {
        label: 'CO2 Level',
        updateTime: '15s ago'
      }
    );

    this.phInfoCard = this.widgetFactory.createInfoCardWidget(
      'ph',
      7.2,
      {
        label: 'Water pH Level',
        trend: {
          direction: 'stable',
          value: 0
        },
        stats: {
          min: 6.8,
          max: 7.5
        },
        updateTime: '30s ago'
      }
    );
  }
}
