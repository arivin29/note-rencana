import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

export type ProjectMapNode = {
  id: string;
  name: string;
  coords: [number, number];
};

@Component({
  selector: 'iot-project-map-widget',
  templateUrl: './project-map-widget.component.html',
  styleUrls: ['./project-map-widget.component.scss'],
  standalone: false
})
export class ProjectMapWidgetComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() nodes: ProjectMapNode[] = [];
  @ViewChild('mapRef') mapRef?: ElementRef<HTMLDivElement>;

  private map?: Map;
  private vectorSource?: VectorSource;
  private markerStyle = new Style({
    image: new CircleStyle({
      radius: 8,
      stroke: new Stroke({
        color: '#ffffff',
        width: 2
      }),
      fill: new Fill({
        color: '#0d6efd'
      })
    })
  });

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nodes'] && !changes['nodes'].firstChange) {
      this.refreshFeatures();
    }
  }

  ngOnDestroy(): void {
    this.map?.setTarget(undefined);
    this.map = undefined;
    this.vectorSource = undefined;
  }

  private initMap(): void {
    const target = this.mapRef?.nativeElement;
    if (!target) {
      return;
    }

    this.vectorSource = new VectorSource();

    this.map = new Map({
      target,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        new VectorLayer({
          source: this.vectorSource
        })
      ],
      view: new View({
        center: fromLonLat(this.getMapCenter()),
        zoom: 13
      })
    });

    this.refreshFeatures();
  }

  private refreshFeatures(): void {
    if (!this.vectorSource) {
      return;
    }

    this.vectorSource.clear();

    const features = this.nodes.map(
      (node) =>
        new Feature({
          geometry: new Point(fromLonLat(node.coords)),
          nodeId: node.id,
          nodeName: node.name
        })
    );

    features.forEach((feature) => feature.setStyle(this.markerStyle));
    this.vectorSource.addFeatures(features);

    if (this.map) {
      this.map.getView().setCenter(fromLonLat(this.getMapCenter()));
    }
  }

  private getMapCenter(): [number, number] {
    if (!this.nodes.length) {
      return [0, 0];
    }

    const sum = this.nodes.reduce(
      (acc, node) => {
        return {
          lon: acc.lon + node.coords[0],
          lat: acc.lat + node.coords[1]
        };
      },
      { lon: 0, lat: 0 }
    );

    return [sum.lon / this.nodes.length, sum.lat / this.nodes.length];
  }
}
