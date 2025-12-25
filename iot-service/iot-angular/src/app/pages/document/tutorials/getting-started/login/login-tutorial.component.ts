import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig, TutorialSection } from '../../shared/tutorial-metadata.interface';

@Component({
  selector: 'app-login-tutorial',
  standalone: false,
  templateUrl: './login-tutorial.component.html',
  styleUrls: ['./login-tutorial.component.scss']
})
export class LoginTutorialComponent extends TutorialBaseComponent {
  override metadata: TutorialMetadataConfig = {
    id: 'getting-started-login',
    title: 'Getting Started: Login to System',
    description: 'Learn how to access the IoT Monitoring System',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: 3,
    roles: ['user', 'admin', 'owner', 'super_admin'],
    tags: ['login', 'authentication', 'access'],
    icon: 'bi bi-box-arrow-in-right',
    author: 'IoT Support Team',
    order: 1,
    sections: [
      { title: 'Access the Login Page' },
      { title: 'Enter Your Credentials' },
      { title: 'Login Options' },
      { title: 'Complete Login' },
      { title: 'Forgot Password' },
      { title: 'Troubleshooting' }
    ]
  };
}
