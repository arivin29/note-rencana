# 📋 12 - Testing Strategy

> **Document:** Testing Strategy & Test Cases  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 12.1 Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  5%
                    │   Tests     │  (Few, slow, high value)
                    ├─────────────┤
                    │ Integration │  25%
                    │   Tests     │  (API, Database)
                    ├─────────────┤
                    │    Unit     │  70%
                    │   Tests     │  (Many, fast, isolated)
                    └─────────────┘
```

---

## 12.2 Backend Testing

### Unit Tests

#### Dashboard Service Tests

```typescript
// src/modules/dashboards/dashboards.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardsService } from './dashboards.service';
import { Dashboard } from './entities/dashboard.entity';
import { DashboardShare } from './entities/dashboard-share.entity';
import { Widget } from '../widgets/entities/widget.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('DashboardsService', () => {
  let service: DashboardsService;
  let dashboardRepo: jest.Mocked<Repository<Dashboard>>;
  let shareRepo: jest.Mocked<Repository<DashboardShare>>;
  let widgetRepo: jest.Mocked<Repository<Widget>>;

  const mockUser = {
    idUser: 'user-uuid',
    idOwner: 'owner-uuid',
    role: 'owner',
    isAdmin: false,
  };

  const mockDashboard: Partial<Dashboard> = {
    idDashboard: 'dashboard-uuid',
    idOwner: 'owner-uuid',
    name: 'Test Dashboard',
    description: 'Test description',
    isPublic: false,
    isTemplate: false,
    settings: { refreshInterval: 30 },
    layout: { columns: 12 },
    widgets: [],
    shares: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardsService,
        {
          provide: getRepositoryToken(Dashboard),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DashboardShare),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Widget),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardsService>(DashboardsService);
    dashboardRepo = module.get(getRepositoryToken(Dashboard));
    shareRepo = module.get(getRepositoryToken(DashboardShare));
    widgetRepo = module.get(getRepositoryToken(Widget));
  });

  describe('findOne', () => {
    it('should return dashboard if user is owner', async () => {
      dashboardRepo.findOne.mockResolvedValue(mockDashboard as Dashboard);

      const result = await service.findOne('dashboard-uuid', mockUser);

      expect(result).toEqual(mockDashboard);
      expect(dashboardRepo.findOne).toHaveBeenCalledWith({
        where: { idDashboard: 'dashboard-uuid' },
        relations: ['widgets', 'project', 'owner'],
      });
    });

    it('should throw NotFoundException if dashboard not found', async () => {
      dashboardRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid', mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      const otherOwnerDashboard = { ...mockDashboard, idOwner: 'other-owner-uuid' };
      dashboardRepo.findOne.mockResolvedValue(otherOwnerDashboard as Dashboard);
      shareRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('dashboard-uuid', mockUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow access to public dashboard', async () => {
      const publicDashboard = { ...mockDashboard, idOwner: 'other-owner-uuid', isPublic: true };
      dashboardRepo.findOne.mockResolvedValue(publicDashboard as Dashboard);

      const result = await service.findOne('dashboard-uuid', mockUser);

      expect(result).toEqual(publicDashboard);
    });
  });

  describe('create', () => {
    it('should create dashboard with default settings', async () => {
      const createDto = { name: 'New Dashboard' };
      const expectedDashboard = {
        ...createDto,
        idOwner: mockUser.idOwner,
        createdBy: mockUser.idUser,
        settings: expect.any(Object),
        layout: expect.any(Object),
      };

      dashboardRepo.count.mockResolvedValue(0);
      dashboardRepo.create.mockReturnValue(expectedDashboard as Dashboard);
      dashboardRepo.save.mockResolvedValue(expectedDashboard as Dashboard);

      const result = await service.create(createDto, mockUser);

      expect(result).toEqual(expectedDashboard);
      expect(dashboardRepo.create).toHaveBeenCalled();
      expect(dashboardRepo.save).toHaveBeenCalled();
    });

    it('should throw error if dashboard limit reached', async () => {
      dashboardRepo.count.mockResolvedValue(100); // At limit

      await expect(service.create({ name: 'New' }, mockUser))
        .rejects.toThrow('Maximum dashboards limit');
    });
  });

  describe('duplicate', () => {
    it('should create copy with widgets', async () => {
      const originalWithWidgets = {
        ...mockDashboard,
        widgets: [
          { idWidget: 'widget-1', widgetType: 'gauge', title: 'Test Widget' },
        ],
      };

      dashboardRepo.findOne.mockResolvedValue(originalWithWidgets as Dashboard);
      dashboardRepo.create.mockImplementation((data) => data as Dashboard);
      dashboardRepo.save.mockImplementation((data) => Promise.resolve(data as Dashboard));
      widgetRepo.create.mockImplementation((data) => data as Widget);
      widgetRepo.save.mockImplementation((data) => Promise.resolve(data as Widget));

      await service.duplicate('dashboard-uuid', mockUser);

      expect(dashboardRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Dashboard (Copy)',
          isTemplate: false,
          isPublic: false,
        })
      );
      expect(widgetRepo.create).toHaveBeenCalled();
    });
  });
});
```

#### Widget Service Tests

```typescript
// src/modules/widgets/widgets.service.spec.ts

describe('WidgetsService', () => {
  let service: WidgetsService;
  let widgetRepo: jest.Mocked<Repository<Widget>>;
  let dashboardService: jest.Mocked<DashboardsService>;

  describe('bulkUpdatePositions', () => {
    it('should update multiple widget positions', async () => {
      const positions = [
        { idWidget: 'w1', x: 0, y: 0, w: 4, h: 3 },
        { idWidget: 'w2', x: 4, y: 0, w: 4, h: 3 },
      ];

      widgetRepo.findOne.mockResolvedValueOnce({ idWidget: 'w1' } as Widget);
      widgetRepo.findOne.mockResolvedValueOnce({ idWidget: 'w2' } as Widget);
      widgetRepo.save.mockResolvedValue({} as Widget);

      const result = await service.bulkUpdatePositions(
        'dashboard-uuid',
        { positions },
        mockUser
      );

      expect(result.updated).toBe(2);
      expect(widgetRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should validate all widgets belong to dashboard', async () => {
      const positions = [{ idWidget: 'invalid', x: 0, y: 0, w: 4, h: 3 }];
      widgetRepo.findOne.mockResolvedValue(null);

      await expect(
        service.bulkUpdatePositions('dashboard-uuid', { positions }, mockUser)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should enforce widget limit per dashboard', async () => {
      widgetRepo.count.mockResolvedValue(50); // At limit

      await expect(
        service.create('dashboard-uuid', { widgetType: 'gauge' }, mockUser)
      ).rejects.toThrow('Maximum widgets limit');
    });

    it('should validate widget type', async () => {
      widgetRepo.count.mockResolvedValue(0);

      await expect(
        service.create('dashboard-uuid', { widgetType: 'invalid-type' }, mockUser)
      ).rejects.toThrow('Invalid widget type');
    });
  });
});
```

### Integration Tests

```typescript
// test/dashboards.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dashboard } from '../src/modules/dashboards/entities/dashboard.entity';

describe('DashboardsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testDashboardId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Get auth token (login as test user)
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /dashboards', () => {
    it('should create a new dashboard', async () => {
      const response = await request(app.getHttpServer())
        .post('/dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Dashboard',
          description: 'Created by e2e test',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'E2E Test Dashboard',
        description: 'Created by e2e test',
      });
      expect(response.body.idDashboard).toBeDefined();

      testDashboardId = response.body.idDashboard;
    });

    it('should fail without auth token', async () => {
      await request(app.getHttpServer())
        .post('/dashboards')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should validate name is required', async () => {
      await request(app.getHttpServer())
        .post('/dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'No name' })
        .expect(400);
    });
  });

  describe('GET /dashboards', () => {
    it('should return list of dashboards', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter by search', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboards')
        .query({ search: 'E2E' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items.every((d: any) => 
        d.name.includes('E2E') || d.description?.includes('E2E')
      )).toBe(true);
    });
  });

  describe('GET /dashboards/:id', () => {
    it('should return dashboard with widgets', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboards/${testDashboardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.idDashboard).toBe(testDashboardId);
      expect(response.body.widgets).toBeDefined();
    });

    it('should return 404 for non-existent dashboard', async () => {
      await request(app.getHttpServer())
        .get('/dashboards/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /dashboards/:id', () => {
    it('should update dashboard', async () => {
      const response = await request(app.getHttpServer())
        .put(`/dashboards/${testDashboardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Dashboard Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Dashboard Name');
    });
  });

  describe('POST /dashboards/:id/duplicate', () => {
    it('should duplicate dashboard', async () => {
      const response = await request(app.getHttpServer())
        .post(`/dashboards/${testDashboardId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.name).toContain('(Copy)');
      expect(response.body.idDashboard).not.toBe(testDashboardId);
    });
  });

  describe('DELETE /dashboards/:id', () => {
    it('should delete dashboard', async () => {
      await request(app.getHttpServer())
        .delete(`/dashboards/${testDashboardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deleted
      await request(app.getHttpServer())
        .get(`/dashboards/${testDashboardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
```

---

## 12.3 Frontend Testing

### Component Unit Tests

```typescript
// dashboard-list.component.spec.ts

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { DashboardListComponent } from './dashboard-list.component';
import { DashboardsService } from '@api/services';

describe('DashboardListComponent', () => {
  let component: DashboardListComponent;
  let fixture: ComponentFixture<DashboardListComponent>;
  let dashboardsService: jest.Mocked<DashboardsService>;

  const mockDashboards = {
    items: [
      { idDashboard: '1', name: 'Dashboard 1', widgetCount: 5 },
      { idDashboard: '2', name: 'Dashboard 2', widgetCount: 3 },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
  };

  beforeEach(async () => {
    const dashboardsServiceMock = {
      findAll: jest.fn().mockReturnValue(of(mockDashboards)),
      remove: jest.fn().mockReturnValue(of({ success: true })),
    };

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      declarations: [DashboardListComponent],
      providers: [
        { provide: DashboardsService, useValue: dashboardsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardListComponent);
    component = fixture.componentInstance;
    dashboardsService = TestBed.inject(DashboardsService) as jest.Mocked<DashboardsService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboards on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(dashboardsService.findAll).toHaveBeenCalled();
    expect(component.dashboards).toEqual(mockDashboards.items);
    expect(component.loading).toBe(false);
  }));

  it('should show loading state', () => {
    component.loading = true;
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('.loading');
    expect(loadingEl).toBeTruthy();
  });

  it('should show empty state when no dashboards', fakeAsync(() => {
    dashboardsService.findAll.mockReturnValue(of({ items: [], total: 0 }));
    fixture.detectChanges();
    tick();

    const emptyEl = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyEl).toBeTruthy();
  }));

  it('should handle error', fakeAsync(() => {
    dashboardsService.findAll.mockReturnValue(throwError(() => new Error('Failed')));
    fixture.detectChanges();
    tick();

    expect(component.error).toBe('Failed to load dashboards');
  }));

  it('should delete dashboard with confirmation', fakeAsync(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.detectChanges();
    tick();

    component.deleteDashboard('1');
    tick();

    expect(dashboardsService.remove).toHaveBeenCalledWith('1');
    expect(dashboardsService.findAll).toHaveBeenCalledTimes(2); // Initial + refresh
  }));

  it('should not delete if not confirmed', fakeAsync(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.detectChanges();
    tick();

    component.deleteDashboard('1');
    tick();

    expect(dashboardsService.remove).not.toHaveBeenCalled();
  }));
});
```

### Service Tests

```typescript
// dashboard-state.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { DashboardStateService } from './dashboard-state.service';

describe('DashboardStateService', () => {
  let service: DashboardStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardStateService],
    });
    service = TestBed.inject(DashboardStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setDashboard', () => {
    it('should update state with dashboard', () => {
      const dashboard = { idDashboard: '1', name: 'Test', widgets: [] };
      
      service.setDashboard(dashboard as any);
      
      const state = service.getCurrentState();
      expect(state.dashboard).toEqual(dashboard);
      expect(state.widgets).toEqual([]);
      expect(state.isDirty).toBe(false);
    });
  });

  describe('addWidget', () => {
    it('should add widget and mark as dirty', () => {
      const widget = { idWidget: 'w1', widgetType: 'gauge' };
      
      service.addWidget(widget as any);
      
      const state = service.getCurrentState();
      expect(state.widgets).toContainEqual(widget);
      expect(state.isDirty).toBe(true);
    });
  });

  describe('updateWidget', () => {
    it('should update existing widget', () => {
      const widget = { idWidget: 'w1', widgetType: 'gauge', title: 'Original' };
      service.addWidget(widget as any);

      service.updateWidget('w1', { title: 'Updated' });

      const state = service.getCurrentState();
      expect(state.widgets[0].title).toBe('Updated');
    });

    it('should not affect other widgets', () => {
      service.addWidget({ idWidget: 'w1', title: 'Widget 1' } as any);
      service.addWidget({ idWidget: 'w2', title: 'Widget 2' } as any);

      service.updateWidget('w1', { title: 'Updated' });

      const state = service.getCurrentState();
      expect(state.widgets[1].title).toBe('Widget 2');
    });
  });

  describe('removeWidget', () => {
    it('should remove widget by id', () => {
      service.addWidget({ idWidget: 'w1' } as any);
      service.addWidget({ idWidget: 'w2' } as any);

      service.removeWidget('w1');

      const state = service.getCurrentState();
      expect(state.widgets).toHaveLength(1);
      expect(state.widgets[0].idWidget).toBe('w2');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      service.setDashboard({ idDashboard: '1', widgets: [] } as any);
      service.addWidget({ idWidget: 'w1' } as any);
      service.setEditMode(true);

      service.reset();

      const state = service.getCurrentState();
      expect(state.dashboard).toBeNull();
      expect(state.widgets).toHaveLength(0);
      expect(state.editMode).toBe(false);
    });
  });
});
```

### Widget Component Tests

```typescript
// line-chart-widget.component.spec.ts

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LineChartWidgetComponent } from './line-chart-widget.component';
import { WidgetDataService } from '../../services/widget-data.service';
import { DashboardRealtimeService } from '../../services/dashboard-realtime.service';
import { of, Subject } from 'rxjs';

describe('LineChartWidgetComponent', () => {
  let component: LineChartWidgetComponent;
  let fixture: ComponentFixture<LineChartWidgetComponent>;
  let widgetDataService: jest.Mocked<WidgetDataService>;
  let realtimeService: jest.Mocked<DashboardRealtimeService>;
  
  const mockWidget = {
    idWidget: 'widget-1',
    widgetType: 'line-chart',
    title: 'Test Chart',
    dataSource: {
      type: 'sensor',
      nodeId: 'node-1',
      sensorId: 'sensor-1',
      channelKey: 'temperature',
    },
    config: {
      lineColor: '#1890ff',
      showLegend: true,
    },
    refreshIntervalSec: 30,
  };

  const mockData = {
    dataType: 'timeseries',
    data: [
      { timestamp: '2026-01-25T10:00:00Z', value: 25.5 },
      { timestamp: '2026-01-25T10:01:00Z', value: 25.7 },
    ],
  };

  beforeEach(async () => {
    const widgetDataSubject = new Subject();

    await TestBed.configureTestingModule({
      declarations: [LineChartWidgetComponent],
      providers: [
        {
          provide: WidgetDataService,
          useValue: {
            fetchWidgetData: jest.fn().mockReturnValue(of(mockData)),
          },
        },
        {
          provide: DashboardRealtimeService,
          useValue: {
            getWidgetData: jest.fn().mockReturnValue(widgetDataSubject),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LineChartWidgetComponent);
    component = fixture.componentInstance;
    component.widget = mockWidget as any;
    widgetDataService = TestBed.inject(WidgetDataService) as jest.Mocked<WidgetDataService>;
    realtimeService = TestBed.inject(DashboardRealtimeService) as jest.Mocked<DashboardRealtimeService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch data on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(widgetDataService.fetchWidgetData).toHaveBeenCalledWith('widget-1');
    expect(component.data).toEqual(mockData);
  }));

  it('should generate chart options from data', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.chartOptions).toBeDefined();
    expect(component.chartOptions.series).toBeDefined();
    expect(component.chartOptions.series[0].data).toHaveLength(2);
  }));

  it('should show loading state while fetching', fakeAsync(() => {
    fixture.detectChanges();
    
    expect(component.isLoading).toBe(true);
    
    tick();
    
    expect(component.isLoading).toBe(false);
  }));

  it('should not fetch in edit mode', fakeAsync(() => {
    component.editMode = true;
    fixture.detectChanges();
    tick();

    expect(widgetDataService.fetchWidgetData).not.toHaveBeenCalled();
  }));

  it('should append data on realtime update', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const initialLength = component.data.data.length;
    
    // Simulate realtime update
    component['handleRealtimeUpdate']({
      widgetId: 'widget-1',
      timestamp: '2026-01-25T10:02:00Z',
      data: { value: 25.8 },
    });

    expect(component.data.data.length).toBe(initialLength + 1);
  }));
});
```

---

## 12.4 E2E Tests (Cypress)

```typescript
// cypress/e2e/dashboards.cy.ts

describe('Dashboard Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
    cy.visit('/iot/dynamic-dashboards');
  });

  it('should display dashboard list', () => {
    cy.get('[data-testid="dashboard-list"]').should('be.visible');
  });

  it('should create new dashboard', () => {
    cy.get('[data-testid="new-dashboard-btn"]').click();
    cy.get('[data-testid="dashboard-name-input"]').type('Cypress Test Dashboard');
    cy.get('[data-testid="create-btn"]').click();

    cy.url().should('include', '/edit');
    cy.get('[data-testid="dashboard-canvas"]').should('be.visible');
  });

  it('should add widget to dashboard', () => {
    // Navigate to existing dashboard
    cy.get('[data-testid="dashboard-card"]').first().click();
    cy.get('[data-testid="edit-btn"]').click();

    // Add gauge widget
    cy.get('[data-testid="widget-library"]').should('be.visible');
    cy.get('[data-testid="widget-type-gauge"]').drag('[data-testid="dashboard-canvas"]');

    // Configure widget
    cy.get('[data-testid="widget-config-modal"]').should('be.visible');
    cy.get('[data-testid="widget-title-input"]').clear().type('Temperature');
    cy.get('[data-testid="node-select"]').click();
    cy.get('[data-testid="node-option"]').first().click();
    cy.get('[data-testid="sensor-select"]').click();
    cy.get('[data-testid="sensor-option"]').first().click();
    cy.get('[data-testid="channel-select"]').click();
    cy.get('[data-testid="channel-option-temperature"]').click();
    cy.get('[data-testid="save-widget-btn"]').click();

    // Verify widget added
    cy.get('[data-testid="widget-wrapper"]').should('have.length.at.least', 1);
  });

  it('should move and resize widget', () => {
    cy.visit('/iot/dynamic-dashboards/test-dashboard-id/edit');

    // Get initial position
    cy.get('[data-testid="widget-wrapper"]').first().as('widget');
    cy.get('@widget').then(($widget) => {
      const initialRect = $widget[0].getBoundingClientRect();

      // Drag widget
      cy.get('@widget').drag('[data-testid="dashboard-canvas"]', {
        force: true,
        target: { x: 200, y: 100 },
      });

      // Verify position changed
      cy.get('@widget').then(($newWidget) => {
        const newRect = $newWidget[0].getBoundingClientRect();
        expect(newRect.left).to.not.equal(initialRect.left);
      });
    });
  });

  it('should save dashboard', () => {
    cy.visit('/iot/dynamic-dashboards/test-dashboard-id/edit');
    
    // Make a change
    cy.get('[data-testid="widget-wrapper"]').first().dblclick();
    cy.get('[data-testid="widget-title-input"]').clear().type('Updated Title');
    cy.get('[data-testid="save-widget-btn"]').click();

    // Save dashboard
    cy.get('[data-testid="save-dashboard-btn"]').click();

    // Verify saved
    cy.get('[data-testid="save-success-toast"]').should('be.visible');
  });

  it('should delete dashboard', () => {
    cy.get('[data-testid="dashboard-card"]')
      .contains('Cypress Test Dashboard')
      .parent()
      .find('[data-testid="delete-btn"]')
      .click();

    cy.get('[data-testid="confirm-delete-btn"]').click();

    cy.get('[data-testid="dashboard-card"]')
      .contains('Cypress Test Dashboard')
      .should('not.exist');
  });
});

describe('Real-time Updates', () => {
  it('should show live data updates', () => {
    cy.login('test@example.com', 'password');
    cy.visit('/iot/dynamic-dashboards/test-dashboard-id/view');

    // Wait for initial data
    cy.get('[data-testid="widget-wrapper"]').first()
      .find('[data-testid="widget-value"]')
      .should('not.be.empty');

    // Wait for update (mock or real)
    cy.wait(5000);

    // Verify last update timestamp changed
    cy.get('[data-testid="last-update"]')
      .invoke('text')
      .should('match', /\d{2}:\d{2}:\d{2}/);
  });

  it('should show connection status', () => {
    cy.visit('/iot/dynamic-dashboards/test-dashboard-id/view');
    
    cy.get('[data-testid="connection-status"]')
      .should('have.class', 'connected');
  });
});
```

---

## 12.5 Test Coverage Goals

| Area | Target Coverage |
|------|-----------------|
| Backend Services | 80% |
| Backend Controllers | 70% |
| Frontend Services | 80% |
| Frontend Components | 70% |
| Critical Paths (E2E) | 100% |

---

## 12.6 CI/CD Test Pipeline

```yaml
# .github/workflows/test.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: ./iot-backend
        run: npm ci
        
      - name: Run unit tests
        working-directory: ./iot-backend
        run: npm run test:cov
        
      - name: Run e2e tests
        working-directory: ./iot-backend
        run: npm run test:e2e
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_db
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./iot-backend/coverage

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: ./iot-angular
        run: npm ci
        
      - name: Run unit tests
        working-directory: ./iot-angular
        run: npm run test -- --watch=false --browsers=ChromeHeadless --code-coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./iot-angular/coverage

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd iot-backend && npm ci
          cd ../iot-angular && npm ci
          
      - name: Start services
        run: |
          cd iot-backend && npm run start:test &
          cd ../iot-angular && npm run start &
          npx wait-on http://localhost:3000/api http://localhost:4200
          
      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          working-directory: ./iot-angular
          wait-on: 'http://localhost:4200'
```

---

## Navigation

⬅️ [Previous: Implementation Phases](./11-IMPLEMENTATION-PHASES.md) | [Back to Index](./00-INDEX.md)
