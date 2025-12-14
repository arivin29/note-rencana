# Alert Center - Pagination & Auto-Refresh Feature

## ✅ Features Added

### 1. **Pagination System**
- Server-side pagination with page/limit support
- Smart page navigation (Previous/Next buttons)
- Dynamic page number display (max 5 visible pages)
- Items per page selector (10/20/50/100)
- Total count display: "Showing 1 to 20 of 21 alerts"

### 2. **Auto-Refresh**
- Automatic data refresh every 5 minutes (300,000ms)
- Refreshes statistics, offline summary, and alert list
- Clean subscription cleanup on component destroy
- Console log untuk monitoring: "Auto-refreshing alerts..."

### 3. **UI Improvements**
- Bootstrap pagination component with icons
- Disabled state untuk first/last page
- Active state untuk current page
- Responsive layout with flex alignment

## 📊 Component Structure

### TypeScript Properties
```typescript
// Pagination
filters = {
  status: 'open',
  page: 1,      // Current page
  limit: 20     // Items per page
};
totalAlerts = 0;   // Total records from API
totalPages = 0;    // Calculated: Math.ceil(totalAlerts / limit)

// Auto-refresh
refreshSubscription?: Subscription;
refreshInterval = 300000; // 5 minutes
```

### Methods

#### Pagination Methods
```typescript
goToPage(page: number)    // Navigate to specific page
nextPage()                // Go to next page
previousPage()            // Go to previous page
get pages(): number[]     // Calculate visible page numbers
```

#### Lifecycle Methods
```typescript
ngOnInit()     // Load data + setup auto-refresh
ngOnDestroy()  // Cleanup subscription
```

## 🎨 HTML Template

### Pagination UI
```html
<div class="d-flex justify-content-between align-items-center">
  <!-- Left: Record count -->
  <div class="text-muted small">
    Showing 1 to 20 of 21 alerts
  </div>
  
  <!-- Center: Page navigation -->
  <nav>
    <ul class="pagination pagination-sm">
      <li class="page-item">
        <a class="page-link" (click)="previousPage()">
          <i class="bi bi-chevron-left"></i> Previous
        </a>
      </li>
      
      <li class="page-item" *ngFor="let page of pages" 
          [class.active]="page === filters.page">
        <a class="page-link" (click)="goToPage(page)">{{ page }}</a>
      </li>
      
      <li class="page-item">
        <a class="page-link" (click)="nextPage()">
          Next <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    </ul>
  </nav>
  
  <!-- Right: Items per page selector -->
  <select class="form-select form-select-sm" 
          [(ngModel)]="filters.limit" 
          (change)="filters.page = 1; loadAlerts()">
    <option [value]="10">10 per page</option>
    <option [value]="20">20 per page</option>
    <option [value]="50">50 per page</option>
    <option [value]="100">100 per page</option>
  </select>
</div>
```

## 🔄 Data Flow

### Initial Load
```
ngOnInit()
  ├─> loadStatistics()      → GET /api/alert-events/statistics/summary
  ├─> loadOfflineSummary()  → GET /api/alert-events/statistics/offline-nodes
  └─> loadAlerts()          → GET /api/alert-events?status=open&page=1&limit=20
        └─> Set totalAlerts = response.total
        └─> Calculate totalPages = Math.ceil(totalAlerts / limit)
```

### Pagination Flow
```
User clicks "Next"
  └─> nextPage()
       └─> filters.page++
            └─> loadAlerts()
                 └─> GET /api/alert-events?status=open&page=2&limit=20
```

### Auto-Refresh Flow
```
Every 5 minutes
  └─> interval(300000).subscribe()
       └─> loadStatistics()
       └─> loadOfflineSummary()
       └─> loadAlerts()  // Maintains current page & filters
```

### Filter + Pagination
```
User clicks "Acknowledged" button
  └─> filterByStatus('acknowledged')
       └─> filters.status = 'acknowledged'
       └─> filters.page = 1  // Reset to first page!
       └─> loadAlerts()
            └─> GET /api/alert-events?status=acknowledged&page=1&limit=20
```

## 💡 Smart Features

### 1. Page Number Calculation
```typescript
get pages(): number[] {
  const maxVisible = 5;
  let start = Math.max(1, this.filters.page - 2);
  let end = Math.min(this.totalPages, start + maxVisible - 1);
  
  // Example for page 10 of 20:
  // Shows: [8, 9, 10, 11, 12]
  
  // Example for page 1 of 20:
  // Shows: [1, 2, 3, 4, 5]
  
  // Example for page 20 of 20:
  // Shows: [16, 17, 18, 19, 20]
}
```

### 2. Reset Page on Filter Change
```typescript
filterByStatus(status: string) {
  this.filters.status = status;
  this.filters.page = 1;  // Always reset to page 1!
  this.loadAlerts();
}
```

### 3. Safe Navigation
```typescript
goToPage(page: number) {
  if (page >= 1 && page <= this.totalPages) {  // Boundary check
    this.filters.page = page;
    this.loadAlerts();
  }
}
```

### 4. Memory Leak Prevention
```typescript
ngOnDestroy() {
  if (this.refreshSubscription) {
    this.refreshSubscription.unsubscribe();  // Cleanup!
  }
}
```

## 📊 API Response Handling

### Expected Response Format
```json
{
  "data": [
    {
      "idAlertEvent": "uuid",
      "status": "open",
      "triggeredAt": "2025-12-08T10:35:03Z",
      "note": "Node offline...",
      "alertRule": {
        "ruleType": "node_offline",
        "severity": "critical"
      }
    }
  ],
  "total": 21,    // Total records in DB
  "page": 1,      // Current page
  "limit": 20     // Records per page
}
```

### Component Mapping
```typescript
loadAlerts() {
  this.alertService.getAlertEvents(this.filters).subscribe({
    next: (response) => {
      this.alerts = response.data;           // Alert array
      this.totalAlerts = response.total;     // For pagination
      this.totalPages = Math.ceil(response.total / this.filters.limit);
    }
  });
}
```

## 🎯 Use Cases

### Use Case 1: Browse Through Pages
1. User opens Alert Center → Sees page 1 (20 alerts)
2. User clicks "Next" → Loads page 2
3. User clicks page number "3" → Loads page 3
4. User clicks "Previous" → Back to page 2

### Use Case 2: Change Items Per Page
1. User sees "20 per page" (default)
2. User changes to "50 per page"
3. Component resets to page 1
4. Loads 50 alerts in single page

### Use Case 3: Filter + Pagination
1. User on page 3 of "Open" alerts
2. User clicks "Acknowledged" filter
3. Component resets to page 1 of "Acknowledged"
4. Shows acknowledged alerts from page 1

### Use Case 4: Auto-Refresh
1. User on page 2 at 10:00 AM
2. At 10:05 AM, auto-refresh triggers
3. Stays on page 2, but data refreshed
4. New alerts appear if any

## 🔧 Backend Requirements

### Controller Method
```typescript
@Get()
findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  @Query('status') status?: string,
) {
  const skip = (page - 1) * limit;
  return this.alertEventsService.findAll({ 
    skip, 
    take: limit, 
    status 
  });
}
```

### Service Method
```typescript
async findAll(filters: any) {
  const [data, total] = await this.alertEventRepository.findAndCount({
    where: { status: filters.status },
    skip: filters.skip,
    take: filters.take,
    order: { triggeredAt: 'DESC' }
  });
  
  return {
    data,
    total,
    page: Math.floor(filters.skip / filters.take) + 1,
    limit: filters.take
  };
}
```

## 🎨 CSS Customization (Optional)

```css
/* Pagination hover effects */
.pagination .page-link {
  cursor: pointer;
  transition: all 0.2s;
}

.pagination .page-link:hover {
  background-color: var(--bs-primary);
  color: white;
  border-color: var(--bs-primary);
}

/* Active page highlight */
.pagination .page-item.active .page-link {
  background-color: var(--bs-theme-color);
  border-color: var(--bs-theme-color);
}

/* Disabled state */
.pagination .page-item.disabled .page-link {
  cursor: not-allowed;
  opacity: 0.5;
}
```

## 📝 Testing Checklist

- [x] Load page 1 with default 20 items
- [x] Navigate to next page
- [x] Navigate to previous page
- [x] Click specific page number
- [x] Change items per page (10/20/50/100)
- [x] Filter by status → resets to page 1
- [x] Auto-refresh maintains current page
- [x] Pagination displays correct total count
- [x] Boundary checks (can't go to page 0 or > totalPages)
- [x] Memory leak prevention (ngOnDestroy cleanup)

## 🚀 Performance Considerations

1. **Server-side pagination** - Only load needed records
2. **Lazy loading** - Don't load all 1000+ alerts at once
3. **Smart refresh** - Only refresh current page data
4. **Subscription cleanup** - Prevent memory leaks
5. **Debouncing** - Could add for rapid page changes

## 🔮 Future Enhancements

1. **Infinite scroll** - Alternative to pagination
2. **Virtual scrolling** - For very large lists
3. **Page size persistence** - Save in localStorage
4. **URL parameters** - Shareable page links (?page=3&limit=50)
5. **Jump to page input** - Direct page number entry
6. **Loading skeleton** - Better UX during data fetch

---

**Status:** ✅ Complete  
**Last Updated:** 2025-12-08  
**Next:** Test pagination with 100+ alerts
