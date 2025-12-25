import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TutorialCategory } from '../../models/tutorial.model';
import { TutorialService } from '../../services/tutorial/tutorial.service';

interface CategoryItem {
  category: TutorialCategory;
  label: string;
  icon: string;
  count: number;
}

@Component({
  selector: 'app-tutorial-sidebar',
  standalone: false,
  templateUrl: './tutorial-sidebar.component.html',
  styleUrls: ['./tutorial-sidebar.component.scss']
})
export class TutorialSidebarComponent implements OnInit {
  categories: CategoryItem[] = [
    {
      category: TutorialCategory.GETTING_STARTED,
      label: 'Getting Started',
      icon: 'bi bi-rocket-takeoff',
      count: 0
    },
    {
      category: TutorialCategory.USER_GUIDE,
      label: 'User Guide',
      icon: 'bi bi-person',
      count: 0
    },
    {
      category: TutorialCategory.ADMIN_GUIDE,
      label: 'Admin Guide',
      icon: 'bi bi-shield-check',
      count: 0
    },
    {
      category: TutorialCategory.OWNER_GUIDE,
      label: 'Owner Guide',
      icon: 'bi bi-building',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_DASHBOARD,
      label: 'Dashboard',
      icon: 'bi bi-speedometer2',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_OWNERS,
      label: 'Owners',
      icon: 'bi bi-building',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_PROJECTS,
      label: 'Projects',
      icon: 'bi bi-folder',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_NODES,
      label: 'Nodes',
      icon: 'bi bi-router',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_NODE_MODELS,
      label: 'Node Models',
      icon: 'bi bi-cpu',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_SENSORS,
      label: 'Sensors',
      icon: 'bi bi-thermometer-half',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_ALERTS,
      label: 'Alerts',
      icon: 'bi bi-bell',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_REPORTS,
      label: 'Reports',
      icon: 'bi bi-graph-up',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_USERS,
      label: 'User Management',
      icon: 'bi bi-people',
      count: 0
    },
    {
      category: TutorialCategory.MODULE_PROFILES,
      label: 'Profiles',
      icon: 'bi bi-diagram-3',
      count: 0
    },
    {
      category: TutorialCategory.TROUBLESHOOTING,
      label: 'Troubleshooting',
      icon: 'bi bi-tools',
      count: 0
    },
    {
      category: TutorialCategory.FAQ,
      label: 'FAQ',
      icon: 'bi bi-question-circle',
      count: 0
    }
  ];

  constructor(
    private router: Router,
    private tutorialService: TutorialService
  ) {}

  ngOnInit(): void {
    // Load tutorial counts for each category
    this.tutorialService.getCategoriesWithCount().subscribe(counts => {
      counts.forEach(({ category, count }) => {
        const item = this.categories.find(c => c.category === category);
        if (item) {
          item.count = count;
        }
      });
    });
  }

  navigateToCategory(category: TutorialCategory): void {
    this.router.navigate(['/iot/document', category]);
  }
}
