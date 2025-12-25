import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-login-issues-tutorial',
  templateUrl: './login-issues-tutorial.component.html',
  styleUrls: ['./login-issues-tutorial.component.scss']
})
export class LoginIssuesTutorialComponent extends TutorialBaseComponent {
  override metadata: TutorialMetadataConfig = {
    id: 'troubleshooting-login',
    title: 'Login Issues',
    category: 'Troubleshooting',
    difficulty: 'beginner',
    estimatedTime: 5,
    description: "Can't login, forgot password",
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
