# Documentation & Tutorial Module

## Overview
Module dokumentasi dan tutorial untuk IoT Monitoring System yang menyediakan panduan lengkap untuk semua pengguna (Super Admin, Admin, Owner, dan User).

## Struktur Folder

```
src/app/pages/document/
├── components/
│   ├── tutorial-sidebar.component.ts       # Navigasi kategori tutorial
│   ├── tutorial-sidebar.component.html
│   ├── tutorial-sidebar.component.scss
│   ├── tutorial-list.component.ts          # Daftar tutorial per kategori
│   ├── tutorial-list.component.html
│   ├── tutorial-list.component.scss
│   ├── tutorial-viewer.component.ts        # Viewer untuk membaca tutorial
│   ├── tutorial-viewer.component.html
│   └── tutorial-viewer.component.scss
├── models/
│   └── tutorial.model.ts                   # TypeScript interfaces
├── services/
│   └── tutorial.service.ts                 # Service untuk manage tutorials
├── document.component.ts                   # Main component
├── document.component.html
├── document.component.scss
├── document.module.ts                      # Module definition
└── document-routing.module.ts              # Routing configuration

src/assets/tutorials/                       # Tutorial content (JSON files)
├── getting-started-login.json
├── admin-add-user.json
└── ... (tambahkan tutorial lainnya)
```

## Kategori Tutorial

### 1. Getting Started
- Login to System
- Dashboard Overview
- Basic Navigation
- User Profile Setup

### 2. User Guide
- View Dashboard
- Monitor Nodes
- View Sensor Data
- Check Alerts
- Generate Reports

### 3. Admin Guide
- User Management
- Owner Management
- System Configuration
- Audit Logs
- Backup & Restore

### 4. Owner Guide
- Project Management
- Node Assignment
- Team Management
- Custom Dashboards
- Data Export

### 5. Module Specific
- **Dashboard:** Widgets, Filters, Customization
- **Nodes:** Registration, Configuration, Monitoring
- **Sensors:** Types, Catalogs, Formulas
- **Alerts:** Rules, Events, Notifications
- **Reports:** Templates, Scheduling, Export
- **Users:** Roles, Permissions, Multi-tenant
- **Profiles:** Node Profiles, Templates, RS485 Config

### 6. Troubleshooting
- Connection Issues
- Data Not Updating
- Login Problems
- Permission Errors
- Performance Issues

### 7. FAQ
- Common Questions
- Best Practices
- Tips & Tricks

## Format Tutorial (JSON)

```json
{
  "metadata": {
    "id": "unique-id",
    "title": "Tutorial Title",
    "description": "Brief description",
    "category": "getting-started",
    "difficulty": "beginner",
    "estimatedTime": 10,
    "roles": ["super_admin", "admin"],
    "tags": ["tag1", "tag2"],
    "order": 1,
    "icon": "material-icon-name",
    "author": "Author Name",
    "lastUpdated": "2025-12-22T00:00:00Z"
  },
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "content": "HTML content with <strong>formatting</strong>",
      "order": 1,
      "videoUrl": "https://youtube.com/embed/...",
      "images": ["path/to/image.png"],
      "codeSnippets": [
        {
          "language": "typescript",
          "code": "const example = 'code';",
          "description": "Code explanation"
        }
      ]
    }
  ]
}
```

## Fitur

### ✅ Sudah Dibuat (Skeleton)
- [x] Model & Interface definitions
- [x] Routing setup
- [x] Tutorial Service (CRUD operations)
- [x] Sidebar Navigation dengan kategori
- [x] Tutorial List dengan cards
- [x] Tutorial Viewer dengan sections
- [x] Progress tracking (localStorage)
- [x] Search functionality
- [x] Role-based access control
- [x] Responsive design
- [x] Material Design components
- [x] 2 contoh tutorial (Getting Started & Admin)

### 🚧 Yang Perlu Dilengkapi

#### 1. Tutorial Content
- [ ] Getting Started (5 tutorials)
- [ ] User Guide (8-10 tutorials)
- [ ] Admin Guide (10-12 tutorials)
- [ ] Owner Guide (6-8 tutorials)
- [ ] Module Dashboard (5 tutorials)
- [ ] Module Nodes (6 tutorials)
- [ ] Module Sensors (6 tutorials)
- [ ] Module Alerts (4 tutorials)
- [ ] Module Reports (4 tutorials)
- [ ] Module Users (5 tutorials)
- [ ] Module Profiles (4 tutorials)
- [ ] Troubleshooting (8-10 tutorials)
- [ ] FAQ (15-20 items)

#### 2. Technical Improvements
- [ ] Markdown parser (marked.js atau angular-markdown)
- [ ] Syntax highlighting untuk code (highlight.js atau prism.js)
- [ ] Video embed dengan preview
- [ ] Image lightbox/zoom
- [ ] Copy code button functionality
- [ ] Print tutorial feature
- [ ] Download as PDF
- [ ] Share tutorial link
- [ ] Bookmark favorite tutorials
- [ ] Search dengan autocomplete
- [ ] Filter by role/difficulty
- [ ] Tutorial feedback/rating
- [ ] Backend API integration (opsional)
- [ ] Analytics tracking

#### 3. UX Enhancements
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Table of contents floating sidebar
- [ ] Auto-scroll to section
- [ ] Previous/Next navigation di header
- [ ] Breadcrumb navigation
- [ ] Loading states
- [ ] Empty states
- [ ] Error handling
- [ ] Offline support (PWA)

#### 4. Screenshots & Media
- [ ] Screenshot setiap modul
- [ ] Video tutorial untuk fitur kompleks
- [ ] GIF animasi untuk step-by-step
- [ ] Diagram untuk arsitektur
- [ ] Icon untuk setiap kategori

## Instalasi & Setup

### 1. Install Dependencies (Markdown & Syntax Highlighting)

```bash
npm install marked highlight.js --save
npm install @types/marked --save-dev
```

### 2. Update angular.json (untuk highlight.js styles)

```json
{
  "styles": [
    "src/styles.scss",
    "node_modules/highlight.js/styles/github.css"
  ]
}
```

### 3. Update app-routing.module.ts

```typescript
{
  path: 'iot',
  children: [
    // ... existing routes
    {
      path: 'document',
      loadChildren: () => import('./pages/document/document.module')
        .then(m => m.DocumentModule)
    }
  ]
}
```

### 4. Update menu (sidebar)

Tambahkan menu item di sidebar:

```typescript
{
  label: 'Documentation',
  icon: 'menu_book',
  route: '/iot/document',
  roles: ['super_admin', 'admin', 'owner', 'user']
}
```

## Cara Membuat Tutorial Baru

### 1. Buat File JSON

Buat file baru di `src/assets/tutorials/` dengan format:
```
{category}-{topic}.json
```

Contoh: `module-dashboard-widgets.json`

### 2. Isi Metadata

```json
{
  "metadata": {
    "id": "module-dashboard-widgets",
    "title": "Dashboard: Managing Widgets",
    "description": "Learn how to add, edit, and customize dashboard widgets",
    "category": "module-dashboard",
    "difficulty": "intermediate",
    "estimatedTime": 15,
    "roles": ["admin", "owner"],
    "tags": ["dashboard", "widgets", "customization"],
    "order": 2,
    "icon": "widgets"
  }
}
```

### 3. Tambahkan Sections

```json
{
  "sections": [
    {
      "id": "intro",
      "title": "Introduction",
      "content": "<p>Dashboard widgets allow you to...</p>",
      "order": 1
    }
  ]
}
```

### 4. Load Tutorial di Service

Update `tutorial.service.ts` method `loadTutorials()`:

```typescript
private async loadTutorials(): Promise<void> {
  const tutorialFiles = [
    'getting-started-login',
    'admin-add-user',
    'module-dashboard-widgets',
    // ... tambahkan file lainnya
  ];

  for (const file of tutorialFiles) {
    const response = await fetch(`/assets/tutorials/${file}.json`);
    const tutorial: Tutorial = await response.json();
    this.tutorials.push(tutorial);
  }
}
```

## Best Practices

### Content Writing
1. **Gunakan bahasa yang jelas dan sederhana**
2. **Sertakan screenshot untuk langkah visual**
3. **Berikan contoh konkret**
4. **Tambahkan blockquote untuk tips/warning**
5. **Gunakan list untuk step-by-step**
6. **Sertakan troubleshooting di akhir**

### Code Examples
1. Selalu berikan keterangan untuk code snippet
2. Gunakan syntax highlighting yang tepat
3. Jangan terlalu panjang (max 30 lines)
4. Tambahkan comment untuk code kompleks

### Screenshots
1. Crop hanya bagian yang relevan
2. Gunakan resolusi yang cukup (min 1200px width)
3. Compress untuk web (PNG/WebP)
4. Tambahkan border/shadow untuk clarity
5. Highlight area penting dengan box/arrow

## Kontribusi

Untuk menambahkan tutorial baru:
1. Fork repository
2. Buat tutorial JSON di `/assets/tutorials/`
3. Screenshot fitur yang relevan
4. Test tutorial flow
5. Submit pull request

## TODO Next Phase

1. **Implementasi Markdown Parser**
2. **Tambahkan Syntax Highlighting**
3. **Buat minimal 10 tutorial untuk setiap kategori**
4. **Screenshot semua modul**
5. **Video tutorial untuk fitur kompleks**
6. **Integrate dengan backend API**
7. **Add analytics tracking**
8. **PDF export feature**
9. **Multi-language support**
10. **Tutorial versioning**

---

## Contact
Untuk pertanyaan atau saran terkait dokumentasi:
- Email: support@devetek.com
- Slack: #documentation-team
