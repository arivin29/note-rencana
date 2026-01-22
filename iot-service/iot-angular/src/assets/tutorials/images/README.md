# Tutorial Screenshots & Images

Folder ini berisi semua screenshot dan gambar untuk tutorial documentation.

## 📁 Struktur Folder

```
assets/tutorials/images/
├── module-owners/          # Screenshots untuk Owner module
│   ├── owner-list-interface.png
│   ├── owner-detail-*.png
│   ├── owner-create-*.png
│   └── owner-edit-*.png
├── module-projects/        # Screenshots untuk Project module
├── module-nodes/           # Screenshots untuk Node module
├── module-sensors/         # Screenshots untuk Sensor module
├── module-alerts/          # Screenshots untuk Alert module
├── module-reports/         # Screenshots untuk Report module
├── module-users/           # Screenshots untuk User Management
├── module-profiles/        # Screenshots untuk Profile module
├── module-node-models/     # Screenshots untuk Node Models
├── getting-started/        # Screenshots untuk Getting Started
├── user-guide/             # Screenshots untuk User Guide
├── admin-guide/            # Screenshots untuk Admin Guide
├── owner-guide/            # Screenshots untuk Owner Guide
├── troubleshooting/        # Screenshots untuk Troubleshooting
└── faq/                    # Screenshots untuk FAQ

```

## 📝 Naming Convention

Format: `{module}-{page}-{description}.png`

**Examples:**
- `owner-list-interface.png` - Main interface owner list
- `owner-detail-overview.png` - Owner detail overview section
- `owner-create-form.png` - Create owner form
- `node-list-filters.png` - Node list with filters active
- `dashboard-widgets.png` - Dashboard widgets overview

## 🎯 Best Practices

1. **Naming**
   - Use lowercase with hyphens
   - Descriptive names (avoid dates/timestamps)
   - Format: `module-page-description.png`

2. **Size**
   - Max width: 1920px
   - Optimize for web (compress if > 1MB)
   - PNG format for UI screenshots

3. **Content**
   - Full interface screenshots preferred
   - Annotate if needed (arrows, highlights)
   - Hide sensitive data

4. **Organization**
   - One folder per module
   - Group by tutorial category
   - Keep related images together

## 🔗 Usage in HTML

```html
<img src="assets/tutorials/images/module-owners/owner-list-interface.png" 
     alt="Owner List Interface" 
     class="img-fluid border border-white-transparent-2 rounded shadow-lg">
```

## 📊 Current Statistics

- **Total Folders:** 13+ categories
- **Total Images:** 1 (expanding...)
- **Total Size:** ~3MB

---

**Last Updated:** December 23, 2025
**Maintained by:** Documentation Team
