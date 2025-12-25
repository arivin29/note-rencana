# Component-Based Tutorials System

## 🎯 Overview

Tutorial system yang menggunakan **Angular Components** instead of JSON files. Setiap tutorial adalah component standalone dengan HTML template sendiri yang lebih dinamis dan maintainable.

## 📂 Folder Structure

```
tutorials/
├── shared/
│   ├── tutorial-base.component.ts      # Base class untuk semua tutorial
│   └── tutorial-metadata.interface.ts  # Interface untuk metadata
│
├── getting-started/
│   ├── login/
│   │   ├── login-tutorial.component.ts
│   │   ├── login-tutorial.component.html
│   │   └── login-tutorial.component.scss
│   └── first-login/
│       ├── first-login-tutorial.component.ts
│       ├── first-login-tutorial.component.html
│       └── first-login-tutorial.component.scss
│
├── user-guide/
│   ├── dashboard-overview/
│   ├── view-nodes/
│   └── view-sensors/
│
├── admin-guide/
│   └── add-user/
│
└── owner-guide/
    └── create-project/
```

## ✨ Advantages vs JSON

### JSON Approach ❌
```json
{
  "content": "<h3>Title</h3><p>Text...</p>"
}
```
- Static content
- Hard to maintain
- No syntax highlighting
- No component logic
- No TypeScript type checking

### Component Approach ✅
```html
<h3>{{ title }}</h3>
<p>{{ description }}</p>
<button (click)="doSomething()">Action</button>
```
- Dynamic content
- Easy to maintain
- Full HTML syntax support
- Component logic available
- TypeScript type safety
- Reusable sub-components
- Angular directives (*ngIf, *ngFor, etc.)

## 🏗️ Tutorial Base Class

All tutorials extend `TutorialBaseComponent`:

```typescript
export class LoginTutorialComponent extends TutorialBaseComponent {
  metadata: TutorialMetadataConfig = {
    id: 'getting-started-login',
    title: 'Getting Started: Login',
    difficulty: 'beginner',
    estimatedTime: 3,
    // ... more metadata
  };

  sections: TutorialSection[] = [
    { title: 'Access Login Page' },
    { title: 'Enter Credentials' },
    // ... more sections
  ];
}
```

### Built-in Methods:
- `nextSection()` - Navigate to next section
- `previousSection()` - Navigate to previous section
- `goToSection(index)` - Jump to specific section
- `markCurrentSectionCompleted()` - Mark section done
- `isSectionCompleted(index)` - Check if completed
- `getProgressPercentage()` - Get progress %
- `markAsCompleted()` - Complete entire tutorial
- `resetProgress()` - Clear all progress
- `saveProgress()` - Save to localStorage
- `loadProgress()` - Load from localStorage

## 📝 Creating New Tutorial

### Step 1: Create Folder Structure

```bash
cd tutorials/user-guide/
mkdir dashboard-overview
cd dashboard-overview
touch dashboard-overview-tutorial.component.ts
touch dashboard-overview-tutorial.component.html
touch dashboard-overview-tutorial.component.scss
```

### Step 2: Create TypeScript Component

```typescript
import { Component } from '@angular/core';
import { TutorialBaseComponent } from '../../shared/tutorial-base.component';
import { TutorialMetadataConfig, TutorialSection } from '../../shared/tutorial-metadata.interface';

@Component({
  selector: 'app-dashboard-overview-tutorial',
  standalone: false,
  templateUrl: './dashboard-overview-tutorial.component.html',
  styleUrls: ['./dashboard-overview-tutorial.component.scss']
})
export class DashboardOverviewTutorialComponent extends TutorialBaseComponent {
  metadata: TutorialMetadataConfig = {
    id: 'user-guide-dashboard-overview',
    title: 'User Guide: Dashboard Overview',
    description: 'Learn how to navigate and use the dashboard',
    category: 'user-guide',
    difficulty: 'beginner',
    estimatedTime: 5,
    roles: ['user', 'admin', 'owner'],
    tags: ['dashboard', 'widgets', 'kpi'],
    icon: 'bi bi-speedometer2',
    author: 'IoT Support Team',
    order: 1
  };

  sections: TutorialSection[] = [
    { title: 'Dashboard Layout' },
    { title: 'KPI Cards' },
    { title: 'Widgets' },
    { title: 'Filters' }
  ];
}
```

### Step 3: Create HTML Template

```html
<!-- Tutorial Header -->
<div class="tutorial-header mb-4">
  <div class="d-flex align-items-center mb-3">
    <i [class]="metadata.icon + ' fs-1 text-primary me-3'"></i>
    <div>
      <h1 class="mb-1">{{ metadata.title }}</h1>
      <p class="text-muted mb-0">{{ metadata.description }}</p>
    </div>
  </div>
</div>

<!-- Tutorial Content -->
<div class="tutorial-content">
  <!-- Section 1 -->
  <div class="tutorial-section" *ngIf="currentSection === 0">
    <h2><i class="bi bi-1-circle me-2"></i>Dashboard Layout</h2>
    <div class="content-block">
      <p>Your content here...</p>
    </div>
  </div>

  <!-- Section 2 -->
  <div class="tutorial-section" *ngIf="currentSection === 1">
    <h2><i class="bi bi-2-circle me-2"></i>KPI Cards</h2>
    <div class="content-block">
      <p>Your content here...</p>
    </div>
  </div>
</div>

<!-- Navigation Footer -->
<div class="tutorial-footer mt-5 pt-4">
  <div class="d-flex justify-content-between">
    <button class="btn btn-outline-secondary" 
            (click)="previousSection()" 
            [disabled]="currentSection === 0">
      Previous
    </button>
    <button class="btn btn-primary" 
            (click)="nextSection()" 
            *ngIf="currentSection < sections.length - 1">
      Next
    </button>
    <button class="btn btn-success" 
            (click)="markAsCompleted()" 
            *ngIf="currentSection === sections.length - 1">
      Complete
    </button>
  </div>
</div>
```

### Step 4: Add to Module

In `document.module.ts`:

```typescript
import { DashboardOverviewTutorialComponent } from './tutorials/user-guide/dashboard-overview/dashboard-overview-tutorial.component';

@NgModule({
  declarations: [
    // ... existing components
    DashboardOverviewTutorialComponent
  ]
})
```

### Step 5: Add Route

In `document-routing.module.ts`:

```typescript
{
  path: 'user-guide/dashboard-overview',
  component: DashboardOverviewTutorialComponent
}
```

## 🎨 UI Components Available

### Alerts
```html
<div class="alert alert-info">
  <i class="bi bi-info-circle me-2"></i>
  Info message
</div>

<div class="alert alert-warning">Warning</div>
<div class="alert alert-danger">Error</div>
<div class="alert alert-success">Success</div>
```

### Code/Example Box
```html
<div class="example-box">
  <h4>Example Title</h4>
  <p>Content...</p>
</div>
```

### Tips Box
```html
<div class="tips-box">
  <h5><i class="bi bi-lightbulb me-2"></i>Tips:</h5>
  <ul>
    <li>Tip 1</li>
    <li>Tip 2</li>
  </ul>
</div>
```

### Step-by-Step List
```html
<div class="steps-list">
  <div class="step-item">
    <div class="step-number">1</div>
    <div class="step-content">
      <h5>Step Title</h5>
      <p>Description</p>
    </div>
  </div>
</div>
```

### Troubleshooting Grid
```html
<div class="troubleshoot-grid">
  <div class="issue-card">
    <div class="issue-header">
      <i class="bi bi-wifi-off text-danger"></i>
      <h5>Issue Title</h5>
    </div>
    <ul>
      <li>Solution 1</li>
      <li>Solution 2</li>
    </ul>
  </div>
</div>
```

### Screenshot Placeholder
```html
<div class="screenshot-placeholder">
  <i class="bi bi-image fs-1 text-muted"></i>
  <p class="text-muted">Screenshot: Description</p>
</div>
```

## 📊 Progress Tracking

Progress disimpan di `localStorage` dengan format:

```json
{
  "tutorial-progress-getting-started-login": {
    "currentSection": 2,
    "completedSections": [0, 1],
    "lastUpdated": "2025-12-23T10:30:00Z"
  }
}
```

## 🚀 Features

- ✅ Component-based architecture
- ✅ TypeScript type safety
- ✅ Progress tracking (localStorage)
- ✅ Section navigation
- ✅ Responsive design
- ✅ Dark theme compatible
- ✅ Bootstrap Icons
- ✅ Reusable base class
- ✅ Easy to extend
- ✅ No JSON parsing needed

## 📈 Tutorial Progress

### Completed:
- ✅ Login Tutorial (6 sections)

### In Progress:
- ⏳ First Login Tutorial
- ⏳ Dashboard Overview Tutorial
- ⏳ View Nodes Tutorial

### Planned:
- 📝 ~100+ tutorials across all categories

## 🎯 Next Steps

1. Create more tutorials using the template
2. Add real screenshots
3. Add interactive examples
4. Add video embeds
5. Add quiz/assessment
6. Multi-language support

---

**Status:** Component-based system ready ✅
**Last Updated:** December 23, 2025
