# 🔄 TUTORIAL MODULE WORKFLOW

**Reusable workflow untuk membuat tutorial semua module/sub-module**

---

## 📋 **5-STEP WORKFLOW**

```
1. Upload Screenshot(s) 📸
   ↓
2. AI Analyze Interface 🔍
   ↓
3. Generate HTML Content 📝
   ↓
4. Review & Adjust ✅
   ↓
5. Next Module → Repeat 🔄
```

---

## **STEP 1: Upload Screenshot 📸**

### **What to Upload:**
- ✅ **Main Interface Screenshot** (required)
- ⚪ Additional screenshots (optional):
  - Action buttons/menus
  - Filters in action
  - Forms/modals
  - Detail pages

### **Where to Place:**
```
iot-angular/src/assets/tutorials/images/{module-category}/
└── {module}-{page}-{description}.png
```

**Naming Convention:**
- Format: `{module}-{page}-{description}.png`
- Use lowercase with hyphens
- Descriptive names (avoid dates/timestamps)

**Example:**
```
iot-angular/src/assets/tutorials/images/module-owners/
├── owner-list-interface.png          ← Main list view
├── owner-detail-overview.png         ← Detail page overview
├── owner-create-form.png             ← Create form
├── owner-edit-form.png               ← Edit form
└── owner-projects-list.png           ← Owner projects view
```

**Reference in HTML:**
```html
<img src="assets/tutorials/images/module-owners/owner-list-interface.png" 
     alt="Owner List Interface" 
     class="img-fluid border border-white-transparent-2 rounded shadow-lg">
```

**Best Practices:**
- Max width: 1920px
- Optimize for web (compress if > 1MB)
- PNG format for UI screenshots
- Hide/blur sensitive data if needed

---

## **STEP 2: AI Analyze Interface 🔍**

### **AI Will Analyze:**

#### **A. Source Code Components**
- Read `.ts` file (controller/logic)
- Read `.html` file (template)
- Read routing configuration
- Identify data models/interfaces

#### **B. Extract Key Information:**
1. **Data Model**
   - Interface/Type definitions
   - Field names & types
   - Relationships

2. **Features Available**
   - Filters (status, category, etc)
   - Search functionality
   - Pagination settings
   - Sorting options
   - Actions/buttons

3. **UI Components**
   - Table columns
   - Form fields
   - Tabs/sections
   - Badges/status indicators
   - Action buttons

4. **Routes & Navigation**
   - URL paths
   - Route parameters
   - Related pages

5. **Business Logic**
   - Status values & meanings
   - Computed properties
   - Validation rules
   - Role-based access

#### **C. Analysis Checklist**
```typescript
✅ Component path: /pages/iot/{module}/{sub-module}
✅ Data interface: {Module}Summary / {Module}Detail
✅ Filters: status, category, industry, etc
✅ Search: fields that can be searched
✅ Actions: CRUD operations available
✅ Status/badges: meanings & colors
✅ Routing: list → detail → edit paths
✅ Role access: who can use this module
```

---

## **STEP 3: Generate HTML Content 📝**

### **HTML Structure Template:**

```html
<div class="container">
  <div class="row justify-content-center">
    <div class="col-xl-10">
      
      <!-- Breadcrumb -->
      <ul class="breadcrumb">
        <li class="breadcrumb-item"><a routerLink="/iot/document">Documentation</a></li>
        <li class="breadcrumb-item"><a routerLink="/iot/document/{category}">{Category}</a></li>
        <li class="breadcrumb-item active">{Tutorial Title}</li>
      </ul>

      <!-- Page Header -->
      <h1 class="page-header">
        <i class="bi bi-{icon} text-theme me-2"></i>
        {Tutorial Title}
        <small class="d-block mt-2 text-white-transparent-7">{Subtitle}</small>
      </h1>
      <hr class="mb-4">

      <div class="row">
        <!-- Main Content -->
        <div class="col-xl-9">
          
          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="d-flex justify-content-between mb-2">
              <span class="text-white-transparent-7">Progress</span>
              <span class="text-white">{{ getProgressPercentage() }}%</span>
            </div>
            <div class="progress mb-2" style="height: 6px;">
              <div class="progress-bar bg-theme" [style.width.%]="getProgressPercentage()"></div>
            </div>
          </div>

          <!-- SECTIONS START HERE -->
          
          <!-- Section 1: Overview -->
          <!-- Section 2: Navigation/Access -->
          <!-- Section 3: Interface Walkthrough -->
          <!-- Section 4: How to Use -->
          <!-- Section 5: Understanding Data -->
          <!-- Section 6: Common Scenarios -->
          <!-- Section 7: Tips & Best Practices -->
          <!-- Section 8: Related Tutorials -->
          <!-- Section 9: Quick Reference -->

        </div>

        <!-- Sidebar -->
        <div class="col-xl-3">
          <div class="sticky-top" style="top: 20px;">
            
            <!-- Tutorial Info Card -->
            <card class="mb-3">
              <card-body>
                <!-- Category, difficulty, time, roles, tags -->
              </card-body>
            </card>

            <!-- Table of Contents with nav-scroll -->
            <card>
              <card-header class="fw-bold">
                <i class="bi bi-list-ul me-2"></i>Sections
              </card-header>
              <card-body class="p-0">
                <nav-scroll>
                  <div class="list-group list-group-flush">
                    <a href="#section-id" 
                       class="nav-link list-group-item list-group-item-action bg-transparent text-white border-0">
                      <i class="bi bi-circle-fill text-theme me-2" style="font-size: 6px;"></i>
                      Section Title
                    </a>
                    <!-- More sections... -->
                  </div>
                </nav-scroll>
              </card-body>
            </card>

          </div>
        </div>

      </div>
    </div>
  </div>
</div>
```

### **Content Sections Detail:**

#### **Section 1: Overview (Introduction)**
```html
<div id="introduction" class="mb-5">
  <h4><i class="bi bi-info-circle text-theme me-2"></i>{Section Title}</h4>
  <card>
    <card-body>
      <!-- What is this module? -->
      <!-- Main functions -->
      <!-- When to use it -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Apa itu module ini?
- ✅ Untuk apa digunakan?
- ✅ Fungsi utama (bullet points)
- ✅ Relation to other modules (if any)

#### **Section 2: Navigation/Access**
```html
<div id="getting-started" class="mb-5">
  <h4><i class="bi bi-compass text-theme me-2"></i>Cara Mengakses</h4>
  <card>
    <card-body>
      <!-- Navigation path -->
      <!-- URL path -->
      <!-- Role access -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Sidebar navigation path
- ✅ URL route
- ✅ Role/permission required

#### **Section 3: Interface Walkthrough**
```html
<div id="features" class="mb-5">
  <h4><i class="bi bi-layout-text-window text-theme me-2"></i>Memahami Interface</h4>
  <card>
    <card-body>
      <!-- Screenshot dengan annotation -->
      <!-- Komponen interface breakdown -->
      <!-- Table columns/Form fields explanation -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Screenshot with annotations
- ✅ Header area components
- ✅ Action bar buttons
- ✅ Filter/search controls
- ✅ Table columns explanation
- ✅ Pagination controls

#### **Section 4: How to Use (Step-by-Step)**
```html
<div id="next-steps" class="mb-5">
  <h4><i class="bi bi-play-circle text-theme me-2"></i>Cara Menggunakan</h4>
  
  <!-- Sub-section per feature -->
  <card class="mb-3">
    <card-header>{Feature Name}</card-header>
    <card-body>
      <ol>
        <li>Step 1</li>
        <li>Step 2</li>
        <li>Step 3</li>
      </ol>
      <!-- Tips/warnings -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Filter by {field} (step-by-step)
- ✅ Search functionality
- ✅ View details
- ✅ Create/Edit/Delete (if applicable)
- ✅ Pagination usage
- ✅ Export data (if applicable)

#### **Section 5: Understanding Data**
```html
<div id="understanding-data" class="mb-5">
  <h4><i class="bi bi-graph-up text-theme me-2"></i>Memahami Data</h4>
  <card>
    <card-body>
      <!-- Data hierarchy -->
      <!-- Status meanings -->
      <!-- Field explanations -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Data model hierarchy (visual tree)
- ✅ Status badge meanings (table)
- ✅ Level/tier explanations (if any)
- ✅ Special indicators (alerts, counts, etc)
- ✅ Date/time format explanations

#### **Section 6: Common Scenarios**
```html
<div id="scenarios" class="mb-5">
  <h4><i class="bi bi-journal-check text-theme me-2"></i>Contoh Penggunaan</h4>
  
  <!-- Scenario cards -->
  <card class="mb-3">
    <card-header>Scenario {N}: {Title}</card-header>
    <card-body>
      <p><strong>Situasi:</strong> {situation}</p>
      <p><strong>Langkah:</strong></p>
      <ol>...</ol>
      <p class="text-success"><strong>Result:</strong> {outcome}</p>
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ 3-5 real-world scenarios
- ✅ Each with: Situasi → Langkah → Result
- ✅ Cover common user tasks

#### **Section 7: Tips & Best Practices**
```html
<div id="tips" class="mb-5">
  <h4><i class="bi bi-lightbulb text-theme me-2"></i>Tips & Best Practices</h4>
  <card>
    <card-body>
      <!-- Quick Tips -->
      <!-- Warnings -->
      <!-- Pro Tips -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Quick tips (success alert)
- ✅ Warnings/cautions (warning alert)
- ✅ Pro tips (info alert)

#### **Section 8: Related Tutorials**
```html
<div id="related" class="mb-5">
  <h4><i class="bi bi-link-45deg text-theme me-2"></i>Tutorial Terkait</h4>
  <card>
    <card-body>
      <!-- Related tutorial cards with links -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Next logical tutorial
- ✅ Related modules
- ✅ Prerequisite tutorials (if any)

#### **Section 9: Quick Reference Card**
```html
<div id="quick-reference" class="mb-5">
  <h4><i class="bi bi-card-checklist text-theme me-2"></i>Quick Reference</h4>
  <card>
    <card-body>
      <!-- Boxed summary of key actions -->
    </card-body>
  </card>
</div>
```

**Content to Include:**
- ✅ Key actions summary
- ✅ Keyboard shortcuts (if any)
- ✅ URL path
- ✅ Quick links

---

## **STEP 4: Review & Adjust ✅**

### **Quality Checklist:**

#### **Content Quality**
- [ ] Clear, simple language (fokus user paham)
- [ ] Screenshot included & referenced
- [ ] All table columns explained
- [ ] All buttons/actions documented
- [ ] Step-by-step instructions complete
- [ ] Real-world scenarios included
- [ ] Tips & warnings provided

#### **Technical Quality**
- [ ] No TypeScript errors
- [ ] No HTML syntax errors
- [ ] Bootstrap classes correct
- [ ] Bootstrap icons correct (`bi-xxx`)
- [ ] RouterLink paths correct
- [ ] All sections have IDs for anchors
- [ ] **Table of Contents wrapped in `<nav-scroll>`** (untuk smooth scroll)
- [ ] **Links have `class="nav-link"`** (required by nav-scroll component)

#### **Visual Quality**
- [ ] Screenshots clear & readable
- [ ] Tables formatted properly
- [ ] Badges colored appropriately
- [ ] Alerts use correct variants
- [ ] Icons match content
- [ ] Progress bar working

#### **Navigation**
- [ ] Breadcrumb links correct
- [ ] Table of contents complete
- [ ] Section anchors working
- [ ] Related tutorials linked

---

## **STEP 5: Next Module → Repeat 🔄**

### **Module Priority Order:**

#### **Phase 1: Owners Module (5 tutorials)**
1. ✅ Owner List & Overview (DONE)
2. ⏳ Owner Details & Management
3. ⏳ Create New Owner
4. ⏳ Edit Owner Information
5. ⏳ Manage Owner Projects

#### **Phase 2: Projects Module (5 tutorials)**
6. ⏳ Project List
7. ⏳ Project Details
8. ⏳ Create Project
9. ⏳ Edit Project
10. ⏳ Assign Nodes to Project

#### **Phase 3: Nodes Module (7 tutorials)**
11. ⏳ Node List & Monitoring
12. ⏳ Node Details
13. ⏳ Register New Node
14. ⏳ Node Configuration
15. ⏳ Node Channel Management
16. ⏳ Node Location Tracking
17. ⏳ Unpaired Devices

... (continue untuk module lainnya)

---

## **📝 TEMPLATE EXAMPLE**

### **Reference: Owner List Tutorial**

**Location:** `iot-angular/src/app/pages/document/tutorials/module-owners/owner-list/`

**Files:**
- `owner-list-tutorial.component.ts` (metadata)
- `owner-list-tutorial.component.html` (content)
- `Screenshot 2025-12-23 at 17.02.56.png` (visual)

**Key Features Documented:**
- ✅ Overview & introduction
- ✅ Navigation path
- ✅ Interface breakdown (5 components)
- ✅ Table columns (7 columns explained)
- ✅ How-to steps (6 features)
- ✅ Data hierarchy & status meanings
- ✅ 5 real-world scenarios
- ✅ Tips, warnings, pro tips
- ✅ 4 related tutorials linked
- ✅ Quick reference card

**Estimated Time:** ~60 minutes per tutorial
- Analysis: 15 min
- HTML writing: 30 min
- Review & adjust: 15 min

---

## **🎯 SUCCESS METRICS**

### **User Should Be Able To:**
1. ✅ Understand what the module does
2. ✅ Navigate to the module
3. ✅ Identify all UI components
4. ✅ Use all features step-by-step
5. ✅ Understand data meanings
6. ✅ Apply to real scenarios
7. ✅ Follow best practices
8. ✅ Find related tutorials

### **Tutorial Quality Indicators:**
- 📸 Screenshot included
- 📊 All columns/fields explained
- 🎯 Step-by-step instructions
- 💡 Tips & warnings provided
- 🔗 Related tutorials linked
- ⚡ Quick reference available
- ✅ No technical errors

---

## **🚀 READY TO USE**

**For Next Tutorial:**
1. Upload screenshot(s)
2. Tell AI: "Analyze {module-name} component"
3. AI generates HTML
4. Review & approve
5. Repeat for next module

**Estimated Completion:**
- 5 tutorials/day = **~17 days for all 86 tutorials**
- 3 tutorials/day = **~29 days for all 86 tutorials**

---

**Last Updated:** December 23, 2025
**Status:** ✅ Workflow Validated (Owner List Tutorial)
**Next:** Owner Details & Management Tutorial
