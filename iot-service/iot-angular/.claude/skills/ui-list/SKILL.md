---
name: ui-list
description: Standard list/index page for the IoT Angular app (Bootstrap table OR card grid) — breadcrumb header, card wrapper, tab status filters with counts, filter row, debounced search, sortable columns, pagination, status badges, embedded mode. Use when creating or editing any list/table/index page.
---

# Standard List Page

Reference impls: `pages/iot/nodes/nodes-list/` (table) and `pages/iot/projects/projects-list/` (card grid). Read `ui-coding-style` first.

## Component (TS)
```typescript
@Component({ selector: 'nodes-list', templateUrl: './nodes-list.html',
            styleUrls: ['./nodes-list.scss'], standalone: false })
export class NodesListPage implements OnInit {
  // pagination + sorting
  pageSize = 10; currentPage = 1; pageSizeOptions = [10, 20, 50];
  sortField = ''; sortDirection: 'asc' | 'desc' = 'asc';
  // data + ui state
  nodes: NodeResponseDto[] = []; loading = false; error: string | null = null;
  // filters + search
  filters = { ownerId: '', projectId: '', status: 'All Status' };
  searchTerm = ''; statusOptions = ['All Status', 'online', 'degraded', 'offline'];
  private searchDebounce?: ReturnType<typeof setTimeout>;
  // reuse in another page
  @Input() projectId: string | null = null; @Input() embedded = false;

  ngOnInit() { this.loadNodes(); }

  loadNodes() {
    this.loading = true;
    const params: any = { page: this.currentPage, limit: 100, search: this.searchTerm || undefined };
    if (this.filters.ownerId) params.ownerId = this.filters.ownerId;
    if (this.filters.projectId) params.idProject = this.filters.projectId;
    this.nodesService.nodesControllerFindAll$Response(params).subscribe({
      next: (res) => { let b: any = res.body; if (typeof b === 'string') b = JSON.parse(b);
                       this.nodes = (b.data || []) as NodeResponseDto[]; this.loading = false; },
      error: (err) => { this.error = err?.message || 'Failed to load'; this.loading = false; }
    });
  }
  onSearchChange(v: string) { this.searchTerm = v; this.currentPage = 1;
    clearTimeout(this.searchDebounce); this.searchDebounce = setTimeout(() => this.loadNodes(), 400); }
  setFilter(k: 'status', v: string) { this.filters[k] = v as any; this.loadNodes(); }
  sortBy(f: string) { this.sortDirection = this.sortField === f && this.sortDirection === 'asc' ? 'desc' : 'asc'; this.sortField = f; }
  badgeClass(s: string) { return s === 'online' ? 'badge bg-success-subtle text-success'
                        : s === 'degraded' ? 'badge bg-warning-subtle text-warning'
                        : 'badge bg-secondary-subtle text-secondary'; }
}
```

## Template skeleton (HTML)
```html
<!-- 1. Breadcrumb + page header + primary action (hidden when embedded) -->
<div class="d-flex align-items-center mb-3" *ngIf="!embedded">
  <div>
    <ul class="breadcrumb mb-1">
      <li class="breadcrumb-item"><a href="javascript:;">IoT</a></li>
      <li class="breadcrumb-item active">Nodes</li>
    </ul>
    <h1 class="page-header mb-0">IoT Nodes</h1>
  </div>
  <div class="ms-auto">
    <a routerLink="/iot/nodes/new" class="btn btn-outline-theme btn-sm">
      <i class="fa fa-plus-circle fa-fw me-1"></i> Deploy Node</a>
  </div>
</div>

<card class="shadow-sm">
  <!-- 2. Status tabs with counts -->
  <ul class="nav nav-tabs nav-tabs-v2 px-4">
    <li class="nav-item me-3" *ngFor="let o of statusOptions">
      <a href="javascript:;" class="nav-link px-2" [class.active]="filters.status === o"
         (click)="setFilter('status', o)">
        {{ o === 'All Status' ? 'All' : (o | titlecase) }}
        <span class="badge rounded-pill bg-body text-inverse text-opacity-75 border ms-1">{{ statusCount(o) }}</span>
      </a>
    </li>
  </ul>

  <div class="p-4">
    <!-- 3. Filter row -->
    <div class="row g-3 mb-4">
      <div class="col-lg-4 col-md-6" *ngIf="isAdmin && !embedded">
        <label class="text-muted text-uppercase small d-block mb-1">Owner</label>
        <select class="form-select" [(ngModel)]="filters.ownerId" (ngModelChange)="loadNodes()"> … </select>
      </div>
      <div class="col-lg-4 col-md-6">
        <label class="text-muted text-uppercase small d-block mb-1">Search</label>
        <div class="input-group">
          <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="fa fa-search opacity-50"></i></span>
          <input type="text" class="form-control border-start-0 ps-0" placeholder="Search…"
                 [ngModel]="searchTerm" (ngModelChange)="onSearchChange($event)">
        </div>
      </div>
    </div>

    <!-- 4. Table (use card grid variant instead for catalog-style lists) -->
    <div class="table-responsive">
      <table class="table table-hover text-nowrap align-middle">
        <thead class="text-uppercase text-muted small">
          <tr>
            <th class="sortable" (click)="sortBy('code')">Node
              <i class="fa fa-sort ms-1" *ngIf="sortField !== 'code'"></i>
              <i class="fa fa-sort-up ms-1" *ngIf="sortField === 'code' && sortDirection === 'asc'"></i>
              <i class="fa fa-sort-down ms-1" *ngIf="sortField === 'code' && sortDirection === 'desc'"></i>
            </th>
            <th class="sortable" (click)="sortBy('connectivityStatus')">Status</th>
            <th class="text-end">Last Seen</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let n of paginatedNodes">
            <td>
              <a (click)="navigateToNode(n.idNode)" class="text-inverse fw-semibold text-decoration-none" style="cursor:pointer">{{ n.name || n.code }}</a>
              <div class="text-muted small">{{ n.code }}</div>
            </td>
            <td><span [class]="badgeClass(n.connectivityStatus)">{{ n.connectivityStatus | titlecase }}</span></td>
            <td class="text-end text-muted">{{ n.lastSeenAt ? (n.lastSeenAt | date:'short') : 'Never' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 5. Empty state -->
    <div *ngIf="!loading && !nodes.length" class="text-center text-muted py-5 border-top">No data matches the filter.</div>

    <!-- 6. Pagination -->
    <div class="d-md-flex align-items-center mt-3">
      <div class="me-md-auto">Showing {{ paginationStart }}–{{ paginationEnd }} of {{ totalEntries }}</div>
      <select class="form-select form-select-sm w-auto me-md-3" [ngModel]="pageSize" (ngModelChange)="changePageSize($event)">
        <option *ngFor="let s of pageSizeOptions" [ngValue]="s">{{ s }}</option>
      </select>
      <ul class="pagination mb-0">
        <li class="page-item" [class.disabled]="currentPage === 1"><a class="page-link" href="javascript:;" (click)="goToPage(currentPage-1)">Previous</a></li>
        <li class="page-item" *ngFor="let p of pageNumbers" [class.active]="p === currentPage"><a class="page-link" href="javascript:;" (click)="goToPage(p)">{{ p }}</a></li>
        <li class="page-item" [class.disabled]="currentPage === totalPages"><a class="page-link" href="javascript:;" (click)="goToPage(currentPage+1)">Next</a></li>
      </ul>
    </div>
  </div>
</card>
```

## Card-grid variant
Replace the `<table>` with `<div class="row g-3"><div class="col-xl-4 col-md-6" *ngFor="let item of items"><card>…</card></div></div>`. Use dropdown filters and a 400ms debounced search (see projects-list).

## Rules
- Header: breadcrumb + `h1.page-header` + primary action top-right; hide it all when `@Input() embedded`.
- Always wrap content in `<card>`. Status filter = `nav nav-tabs nav-tabs-v2` with pill count badges.
- Debounce search 400ms; reset to page 1 on filter/search change.
- Status badges via a `badgeClass()` map (`bg-*-subtle text-*`).
- Handle loading / error / empty. Support `embedded` mode so the list can be reused inside a detail/workspace page.
- Fetch with the SDK and read `body.data` per the shared `{ data, meta }` contract.
