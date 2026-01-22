import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig } from '../../shared/tutorial-metadata.interface';

@Component({
  standalone: false,
  selector: 'app-account-security-tutorial',
  templateUrl: './account-security-tutorial.component.html',
  styleUrls: ['./account-security-tutorial.component.scss']
})
export class AccountSecurityTutorialComponent extends TutorialBaseComponent {
  
  override metadata: TutorialMetadataConfig = {
    id: 'faq-security',
    title: 'Account & Security',
    category: 'FAQ',
    difficulty: 'beginner',
    estimatedTime: 6,
    description: 'Password, 2FA, security',
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
