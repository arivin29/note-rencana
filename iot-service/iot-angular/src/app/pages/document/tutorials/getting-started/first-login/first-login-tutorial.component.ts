import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig, TutorialSection } from '../../shared/tutorial-metadata.interface';

@Component({
  selector: 'app-first-login-tutorial',
  standalone: false,
  templateUrl: './first-login-tutorial.component.html',
  styleUrls: ['./first-login-tutorial.component.scss']
})
export class FirstLoginTutorialComponent extends TutorialBaseComponent {
  override metadata: TutorialMetadataConfig = {
    id: 'getting-started-first-login',
    title: 'Getting Started: First Time Login Setup',
    description: 'Complete guide for new users to set up their account on first login',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: 5,
    roles: ['user', 'admin', 'owner', 'super_admin'],
    tags: ['first login', 'setup', 'profile', 'password', 'onboarding'],
    icon: 'bi bi-person-check',
    author: 'IoT Support Team',
    order: 2,
    sections: [
      { title: 'Welcome Screen' },
      { title: 'Change Default Password' },
      { title: 'Complete Your Profile' },
      { title: 'Notification Preferences' },
      { title: 'Accept Terms & Policies' },
      { title: 'Finish Setup' }
    ]
  };
}
