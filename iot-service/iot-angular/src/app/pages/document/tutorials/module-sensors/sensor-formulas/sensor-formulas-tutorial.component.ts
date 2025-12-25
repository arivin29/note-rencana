import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-sensor-formulas-tutorial',
  templateUrl: './sensor-formulas-tutorial.component.html',
  styleUrls: ['./sensor-formulas-tutorial.component.scss']
})
export class SensorFormulasTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-sensors-formulas',
    title: 'Sensor Formulas',
    category: 'Module: Sensors',
    difficulty: 'beginner',
    estimatedTime: 8,
    description: 'Create calculation formulas',
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
