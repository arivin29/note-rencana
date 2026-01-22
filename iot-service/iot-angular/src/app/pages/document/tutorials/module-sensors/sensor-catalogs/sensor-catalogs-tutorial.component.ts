import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-catalogs-tutorial',
  templateUrl: './sensor-catalogs-tutorial.component.html',
  styleUrls: ['./sensor-catalogs-tutorial.component.scss']
})
export class SensorCatalogsTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-sensors-catalogs',
    title: 'Sensor Catalogs',
    category: 'Module: Sensors',
    difficulty: 'beginner',
    estimatedTime: 10,
    description: 'Browse sensor catalogs',
    sections: [
      { id: 'introduction', title: 'Introduction', duration: 2 },
      { id: 'getting-started', title: 'Getting Started', duration: 3 },
      { id: 'features', title: 'Key Features', duration: 3 },
      { id: 'next-steps', title: 'Next Steps', duration: 2 }
    ]
  };

  constructor() {
    super();
  }
}
