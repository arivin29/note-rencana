import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  SearchService,
  SearchResponse,
  NodeSearchResult,
  DeviceSearchResult,
  AlertSearchResult,
  ProjectSearchResult,
  OwnerSearchResult,
} from '../../../../services/search.service';
import { AuthService } from '../../../../services/auth.service';

type SearchCategory = 'all' | 'nodes' | 'devices' | 'alerts' | 'projects' | 'owners';

@Component({
  selector: 'search-page',
  templateUrl: './search-page.html',
  standalone: false,
})
export class SearchPage implements OnInit, OnDestroy {
  searchQuery = '';
  searchResults: SearchResponse | null = null;
  isLoading = false;
  selectedCategory: SearchCategory = 'all';
  isAdmin = false;

  // Debounce subject for search input
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  categories: { key: SearchCategory; label: string; icon: string }[] = [
    { key: 'all', label: 'Semua', icon: 'bi-grid' },
    { key: 'nodes', label: 'Nodes', icon: 'bi-hdd-network' },
    { key: 'devices', label: 'Devices', icon: 'bi-link-45deg' },
    { key: 'alerts', label: 'Alerts', icon: 'bi-exclamation-triangle' },
    { key: 'projects', label: 'Projects', icon: 'bi-folder' },
    { key: 'owners', label: 'Owners', icon: 'bi-building' },
  ];

  constructor(
    private searchService: SearchService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is admin
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.isAdmin = user?.role === 'admin';
      // Filter out owners category for non-admin users
      if (!this.isAdmin) {
        this.categories = this.categories.filter((c) => c.key !== 'owners');
      }
    });

    // Setup debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        if (query.trim().length >= 2) {
          this.performSearch(query);
        } else {
          this.searchResults = null;
        }
      });

    // Check for query param
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['q']) {
        this.searchQuery = params['q'];
        this.searchSubject.next(this.searchQuery);
      }
      if (params['category']) {
        this.selectedCategory = params['category'] as SearchCategory;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
    this.updateUrl();
  }

  onCategoryChange(category: SearchCategory): void {
    this.selectedCategory = category;
    this.updateUrl();
    if (this.searchQuery.trim().length >= 2) {
      this.performSearch(this.searchQuery);
    }
  }

  private updateUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchQuery || null,
        category: this.selectedCategory !== 'all' ? this.selectedCategory : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private performSearch(query: string): void {
    this.isLoading = true;

    const categories =
      this.selectedCategory === 'all'
        ? undefined
        : [this.selectedCategory];

    this.searchService
      .search({ q: query, categories, limit: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.searchResults = response;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Search error:', err);
          this.isLoading = false;
        },
      });
  }

  // Navigate to entity detail pages
  navigateToNode(node: NodeSearchResult): void {
    this.router.navigate(['/iot/nodes', node.id]);
  }

  navigateToDevice(device: DeviceSearchResult): void {
    this.router.navigate(['/iot/unpaired-devices'], { queryParams: { highlight: device.id } });
  }

  navigateToAlert(alert: AlertSearchResult): void {
    this.router.navigate(['/iot/alerts'], { queryParams: { eventId: alert.id } });
  }

  navigateToProject(project: ProjectSearchResult): void {
    this.router.navigate(['/iot/projects', project.id]);
  }

  navigateToOwner(owner: OwnerSearchResult): void {
    this.router.navigate(['/iot/owners', owner.id]);
  }

  // Helpers
  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'active':
      case 'paired':
        return 'bg-success';
      case 'offline':
      case 'inactive':
      case 'open':
        return 'bg-danger';
      case 'pending':
        return 'bg-warning';
      case 'acknowledged':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  getSeverityBadgeClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-danger';
      case 'warning':
        return 'bg-warning text-dark';
      case 'info':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  get totalResults(): number {
    return this.searchResults?.total || 0;
  }

  get hasNoResults(): boolean {
    return (
      !this.isLoading &&
      this.searchQuery.length >= 2 &&
      this.searchResults !== null &&
      this.totalResults === 0
    );
  }

  get showResults(): boolean {
    return this.searchResults !== null && this.totalResults > 0;
  }
}
