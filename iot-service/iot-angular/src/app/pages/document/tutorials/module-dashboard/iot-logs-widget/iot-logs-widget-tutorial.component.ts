import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-iot-logs-widget-tutorial',
  templateUrl: './iot-logs-widget-tutorial.component.html',
  styleUrls: ['./iot-logs-widget-tutorial.component.scss']
})
export class IotLogsWidgetTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'module-dashboard-logs',
    title: 'IoT Logs Widget',
    category: 'Module: Dashboard',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: 'System logs viewer widget',
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
