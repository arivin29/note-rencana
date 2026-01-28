# 📋 09 - Real-time Architecture

> **Document:** Real-time Data Architecture (WebSocket)  
> **Version:** 1.0.0  
> **Last Updated:** January 25, 2026

---

## 9.1 Overview

Real-time architecture menggunakan WebSocket untuk push data dari server ke client, memungkinkan widget untuk update secara real-time tanpa polling.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│   Browser   │     │    NestJS       │     │    Data Sources     │
│  (Angular)  │     │   WebSocket     │     │                     │
│             │     │    Gateway      │     │  ┌───────────────┐  │
│  Dashboard  │◄────│                 │◄────│  │  IoT Gateway  │  │
│   Viewer    │     │  Subscription   │     │  │  (MQTT)       │  │
│             │────►│    Manager      │     │  └───────────────┘  │
│             │     │                 │     │                     │
└─────────────┘     └─────────────────┘     │  ┌───────────────┐  │
                                            │  │  PostgreSQL   │  │
                                            │  │  (Triggers)   │  │
                                            │  └───────────────┘  │
                                            └─────────────────────┘
```

---

## 9.2 WebSocket Events

### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `subscribe:dashboard` | Subscribe to dashboard updates | `{ dashboardId, widgetIds? }` |
| `unsubscribe:dashboard` | Unsubscribe from dashboard | `{ dashboardId }` |
| `subscribe:widget` | Subscribe to single widget | `{ widgetId }` |
| `unsubscribe:widget` | Unsubscribe from widget | `{ widgetId }` |
| `ping` | Keep-alive ping | `{}` |

### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `widget:data` | New data for widget | `{ widgetId, timestamp, data }` |
| `node:status` | Node status change | `{ nodeId, status, timestamp }` |
| `dashboard:updated` | Dashboard config changed | `{ dashboardId, changes }` |
| `error` | Error notification | `{ code, message }` |
| `pong` | Response to ping | `{ timestamp }` |

---

## 9.3 Backend Implementation

### WebSocket Gateway

```typescript
// src/modules/realtime/realtime.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { SubscriptionService } from './services/subscription.service';
import { SubscribeDashboardDto, SubscribeWidgetDto } from './dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/dashboard',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private subscriptionService: SubscriptionService) {}

  // ==================== Connection Lifecycle ====================

  async handleConnection(client: Socket): Promise<void> {
    try {
      // Authenticate via JWT in handshake
      const user = await this.authenticateClient(client);
      if (!user) {
        client.disconnect();
        return;
      }

      // Store user info on socket
      client.data.user = user;
      console.log(`Client connected: ${client.id}, User: ${user.idUser}`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    // Clean up all subscriptions for this client
    this.subscriptionService.removeClient(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  private async authenticateClient(client: Socket): Promise<any> {
    const token = client.handshake.auth?.token || 
                  client.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    // Verify JWT and return user
    // ... JWT verification logic
    return { idUser: 'user-uuid', idOwner: 'owner-uuid' }; // Simplified
  }

  // ==================== Dashboard Subscriptions ====================

  @SubscribeMessage('subscribe:dashboard')
  async handleSubscribeDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeDashboardDto,
  ): Promise<void> {
    const { dashboardId, widgetIds } = data;
    const user = client.data.user;

    // Validate access to dashboard
    const hasAccess = await this.subscriptionService.validateDashboardAccess(
      dashboardId,
      user,
    );

    if (!hasAccess) {
      client.emit('error', { code: 'ACCESS_DENIED', message: 'No access to dashboard' });
      return;
    }

    // Join dashboard room
    client.join(`dashboard:${dashboardId}`);

    // Subscribe to specific widgets or all widgets
    if (widgetIds && widgetIds.length > 0) {
      widgetIds.forEach((widgetId) => {
        client.join(`widget:${widgetId}`);
      });
    } else {
      // Subscribe to all widgets in dashboard
      const widgets = await this.subscriptionService.getDashboardWidgets(dashboardId);
      widgets.forEach((widget) => {
        client.join(`widget:${widget.idWidget}`);
      });
    }

    // Register subscription
    this.subscriptionService.addSubscription(client.id, dashboardId, user);

    // Send initial data
    await this.sendInitialData(client, dashboardId, widgetIds);

    console.log(`Client ${client.id} subscribed to dashboard ${dashboardId}`);
  }

  @SubscribeMessage('unsubscribe:dashboard')
  handleUnsubscribeDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { dashboardId: string },
  ): void {
    const { dashboardId } = data;

    // Leave dashboard room
    client.leave(`dashboard:${dashboardId}`);

    // Leave all widget rooms for this dashboard
    this.subscriptionService.getDashboardWidgetIds(dashboardId).forEach((widgetId) => {
      client.leave(`widget:${widgetId}`);
    });

    // Remove subscription
    this.subscriptionService.removeSubscription(client.id, dashboardId);

    console.log(`Client ${client.id} unsubscribed from dashboard ${dashboardId}`);
  }

  // ==================== Widget Subscriptions ====================

  @SubscribeMessage('subscribe:widget')
  async handleSubscribeWidget(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeWidgetDto,
  ): Promise<void> {
    const { widgetId } = data;

    client.join(`widget:${widgetId}`);
    console.log(`Client ${client.id} subscribed to widget ${widgetId}`);
  }

  @SubscribeMessage('unsubscribe:widget')
  handleUnsubscribeWidget(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { widgetId: string },
  ): void {
    const { widgetId } = data;
    client.leave(`widget:${widgetId}`);
  }

  // ==================== Keep-Alive ====================

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // ==================== Broadcasting ====================

  /**
   * Broadcast data to a specific widget
   */
  broadcastWidgetData(widgetId: string, data: any): void {
    this.server.to(`widget:${widgetId}`).emit('widget:data', {
      widgetId,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Broadcast node status change
   */
  broadcastNodeStatus(nodeId: string, status: string): void {
    // Find all widgets that use this node and broadcast
    const affectedWidgets = this.subscriptionService.getWidgetsByNodeId(nodeId);
    
    affectedWidgets.forEach((widgetId) => {
      this.server.to(`widget:${widgetId}`).emit('node:status', {
        nodeId,
        status,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Broadcast dashboard config update
   */
  broadcastDashboardUpdate(dashboardId: string, changes: any): void {
    this.server.to(`dashboard:${dashboardId}`).emit('dashboard:updated', {
      dashboardId,
      changes,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Helpers ====================

  private async sendInitialData(
    client: Socket,
    dashboardId: string,
    widgetIds?: string[],
  ): Promise<void> {
    // Fetch and send current data for all subscribed widgets
    const widgets = await this.subscriptionService.getDashboardWidgets(dashboardId);
    
    for (const widget of widgets) {
      if (!widgetIds || widgetIds.includes(widget.idWidget)) {
        const data = await this.subscriptionService.getWidgetCurrentData(widget);
        if (data) {
          client.emit('widget:data', {
            widgetId: widget.idWidget,
            timestamp: new Date().toISOString(),
            data,
          });
        }
      }
    }
  }
}
```

### Subscription Service

```typescript
// src/modules/realtime/services/subscription.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dashboard } from '../../dashboards/entities/dashboard.entity';
import { Widget } from '../../widgets/entities/widget.entity';
import { WidgetDataService } from '../../widget-data/widget-data.service';

interface Subscription {
  clientId: string;
  dashboardId: string;
  userId: string;
  ownerId: string;
  subscribedAt: Date;
}

@Injectable()
export class SubscriptionService {
  // In-memory subscription storage (consider Redis for production)
  private subscriptions = new Map<string, Subscription[]>();
  private widgetToNodeMap = new Map<string, string>();

  constructor(
    @InjectRepository(Dashboard)
    private dashboardRepo: Repository<Dashboard>,
    @InjectRepository(Widget)
    private widgetRepo: Repository<Widget>,
    private widgetDataService: WidgetDataService,
  ) {}

  async validateDashboardAccess(dashboardId: string, user: any): Promise<boolean> {
    const dashboard = await this.dashboardRepo.findOne({
      where: { idDashboard: dashboardId },
      relations: ['shares'],
    });

    if (!dashboard) return false;
    if (dashboard.isPublic) return true;
    if (dashboard.idOwner === user.idOwner) return true;
    
    const hasShare = dashboard.shares?.some(
      (s) => s.sharedToOwnerId === user.idOwner
    );
    
    return hasShare;
  }

  async getDashboardWidgets(dashboardId: string): Promise<Widget[]> {
    return this.widgetRepo.find({
      where: { idDashboard: dashboardId },
    });
  }

  getDashboardWidgetIds(dashboardId: string): string[] {
    // This should be cached
    return []; // Implement based on your needs
  }

  addSubscription(clientId: string, dashboardId: string, user: any): void {
    const existing = this.subscriptions.get(clientId) || [];
    existing.push({
      clientId,
      dashboardId,
      userId: user.idUser,
      ownerId: user.idOwner,
      subscribedAt: new Date(),
    });
    this.subscriptions.set(clientId, existing);
  }

  removeSubscription(clientId: string, dashboardId: string): void {
    const existing = this.subscriptions.get(clientId) || [];
    const filtered = existing.filter((s) => s.dashboardId !== dashboardId);
    this.subscriptions.set(clientId, filtered);
  }

  removeClient(clientId: string): void {
    this.subscriptions.delete(clientId);
  }

  getWidgetsByNodeId(nodeId: string): string[] {
    // Return widget IDs that use this node
    const widgetIds: string[] = [];
    this.widgetToNodeMap.forEach((nId, widgetId) => {
      if (nId === nodeId) {
        widgetIds.push(widgetId);
      }
    });
    return widgetIds;
  }

  async getWidgetCurrentData(widget: Widget): Promise<any> {
    try {
      const timeRange = {
        from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      };
      return await this.widgetDataService.getWidgetData(widget.idWidget, timeRange, null);
    } catch (error) {
      console.error(`Error fetching data for widget ${widget.idWidget}:`, error);
      return null;
    }
  }

  // Build widget-to-node mapping for efficient lookups
  async buildWidgetNodeMap(): Promise<void> {
    const widgets = await this.widgetRepo.find();
    widgets.forEach((widget) => {
      if (widget.dataSource?.nodeId) {
        this.widgetToNodeMap.set(widget.idWidget, widget.dataSource.nodeId);
      }
    });
  }
}
```

### Broadcast Service

```typescript
// src/modules/realtime/services/broadcast.service.ts

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from '../realtime.gateway';

@Injectable()
export class BroadcastService {
  constructor(
    @Inject(forwardRef(() => RealtimeGateway))
    private gateway: RealtimeGateway,
  ) {}

  /**
   * Called when new telemetry data arrives
   */
  onTelemetryData(nodeId: string, sensorId: string, channelKey: string, value: any): void {
    // Find widgets that subscribe to this data source
    // and broadcast to them
    this.gateway.broadcastWidgetData(`${nodeId}:${sensorId}:${channelKey}`, {
      value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Called when node connectivity status changes
   */
  onNodeStatusChange(nodeId: string, status: 'online' | 'offline' | 'degraded'): void {
    this.gateway.broadcastNodeStatus(nodeId, status);
  }

  /**
   * Called when dashboard is modified
   */
  onDashboardUpdate(dashboardId: string, changes: any): void {
    this.gateway.broadcastDashboardUpdate(dashboardId, changes);
  }
}
```

---

## 9.4 Frontend Implementation

### Dashboard Realtime Service

```typescript
// services/dashboard-realtime.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent, timer } from 'rxjs';
import { filter, takeUntil, retry, tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface WidgetDataEvent {
  widgetId: string;
  timestamp: string;
  data: any;
}

export interface NodeStatusEvent {
  nodeId: string;
  status: 'online' | 'offline' | 'degraded';
  timestamp: string;
}

@Injectable()
export class DashboardRealtimeService implements OnDestroy {
  private socket: Socket | null = null;
  private destroy$ = new Subject<void>();
  
  private connectionStatus$ = new BehaviorSubject<'connected' | 'disconnected' | 'connecting'>('disconnected');
  private widgetData$ = new Subject<WidgetDataEvent>();
  private nodeStatus$ = new Subject<NodeStatusEvent>();

  constructor(private authService: AuthService) {}

  // ==================== Connection ====================

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.connectionStatus$.next('connecting');

    const token = this.authService.getToken();

    this.socket = io(`${environment.wsUrl}/dashboard`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatus$.next('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connectionStatus$.next('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionStatus$.next('disconnected');
    });

    // Data events
    this.socket.on('widget:data', (event: WidgetDataEvent) => {
      this.widgetData$.next(event);
    });

    this.socket.on('node:status', (event: NodeStatusEvent) => {
      this.nodeStatus$.next(event);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Keep-alive
    this.startKeepAlive();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus$.next('disconnected');
  }

  // ==================== Subscriptions ====================

  subscribeToDashboard(dashboardId: string, widgetIds?: string[]): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe: socket not connected');
      return;
    }

    this.socket.emit('subscribe:dashboard', { dashboardId, widgetIds });
  }

  unsubscribeFromDashboard(dashboardId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe:dashboard', { dashboardId });
  }

  subscribeToWidget(widgetId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('subscribe:widget', { widgetId });
  }

  unsubscribeFromWidget(widgetId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe:widget', { widgetId });
  }

  // ==================== Observables ====================

  getConnectionStatus(): Observable<'connected' | 'disconnected' | 'connecting'> {
    return this.connectionStatus$.asObservable();
  }

  getWidgetData(widgetId?: string): Observable<WidgetDataEvent> {
    return this.widgetData$.pipe(
      filter((event) => !widgetId || event.widgetId === widgetId)
    );
  }

  getNodeStatus(nodeId?: string): Observable<NodeStatusEvent> {
    return this.nodeStatus$.pipe(
      filter((event) => !nodeId || event.nodeId === nodeId)
    );
  }

  // ==================== Keep-Alive ====================

  private startKeepAlive(): void {
    timer(30000, 30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.socket?.connected) {
          this.socket.emit('ping');
        }
      });
  }

  // ==================== Cleanup ====================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
```

### Widget Data Integration

```typescript
// widgets/base/base-widget.component.ts (updated)

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Widget } from '../../models';
import { WidgetDataService } from '../../services/widget-data.service';
import { DashboardRealtimeService, WidgetDataEvent } from '../../services/dashboard-realtime.service';

@Component({ template: '' })
export abstract class BaseWidgetComponent implements OnInit, OnDestroy {
  @Input() widget!: Widget;
  @Input() editMode: boolean = false;
  @Input() useRealtime: boolean = true;

  protected destroy$ = new Subject<void>();
  
  data: any = null;
  isLoading: boolean = false;
  lastUpdate: Date | null = null;

  constructor(
    protected widgetDataService: WidgetDataService,
    protected realtimeService: DashboardRealtimeService,
    protected cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Initial data fetch
    this.fetchInitialData();

    // Subscribe to real-time updates
    if (this.useRealtime && !this.editMode) {
      this.subscribeToRealtime();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected fetchInitialData(): void {
    if (!this.hasValidDataSource()) return;

    this.isLoading = true;
    this.widgetDataService.fetchWidgetData(this.widget.idWidget)
      .subscribe({
        next: (data) => {
          this.data = data;
          this.lastUpdate = new Date();
          this.processData(data);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error fetching widget data:', err);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  protected subscribeToRealtime(): void {
    this.realtimeService.getWidgetData(this.widget.idWidget)
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: WidgetDataEvent) => {
        this.handleRealtimeUpdate(event);
      });
  }

  protected handleRealtimeUpdate(event: WidgetDataEvent): void {
    // Merge or replace data based on widget type
    this.data = this.mergeData(this.data, event.data);
    this.lastUpdate = new Date(event.timestamp);
    this.processData(this.data);
    this.cdr.markForCheck();
  }

  protected mergeData(existing: any, newData: any): any {
    // Default: replace data
    // Override in specific widgets for time-series append
    return newData;
  }

  protected hasValidDataSource(): boolean {
    const ds = this.widget.dataSource;
    return !!(ds && ds.type && (ds.nodeId || ds.staticValue !== undefined));
  }

  protected abstract processData(data: any): void;
}
```

### Line Chart with Real-time Append

```typescript
// widgets/line-chart/line-chart-widget.component.ts (real-time support)

@Component({ ... })
export class LineChartWidgetComponent extends BaseWidgetComponent {
  private maxDataPoints = 100; // Keep last 100 points

  protected mergeData(existing: any, newData: any): any {
    if (!existing?.data || !newData?.value) {
      return newData;
    }

    // Append new point to existing time series
    const newPoint = {
      timestamp: newData.timestamp,
      value: newData.value,
    };

    let updatedData = [...existing.data, newPoint];

    // Trim to max points
    if (updatedData.length > this.maxDataPoints) {
      updatedData = updatedData.slice(-this.maxDataPoints);
    }

    return {
      ...existing,
      data: updatedData,
    };
  }

  protected processData(data: any): void {
    // Update chart with new data
    this.updateChartOptions(data);
  }

  private updateChartOptions(data: any): void {
    if (!data?.data) return;

    // Use ECharts setOption for efficient update
    this.chartOptions = {
      ...this.chartOptions,
      series: [{
        ...this.chartOptions.series?.[0],
        data: data.data.map((item: any) => [
          new Date(item.timestamp).getTime(),
          item.value,
        ]),
      }],
    };

    this.cdr.markForCheck();
  }
}
```

---

## 9.5 Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           REAL-TIME DATA FLOW                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. IoT Device sends data                                                   │
│     │                                                                       │
│     ▼                                                                       │
│  ┌─────────────────┐                                                       │
│  │   MQTT Broker   │                                                       │
│  │   (iot-gtw)     │                                                       │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│  2. Gateway processes & saves to DB                                         │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │   PostgreSQL    │────►│ BroadcastService │                              │
│  │  (save payload) │     │ (notify change)  │                              │
│  └─────────────────┘     └────────┬─────────┘                              │
│                                   │                                         │
│  3. Broadcast to subscribed clients                                         │
│                                   │                                         │
│                                   ▼                                         │
│                          ┌─────────────────┐                               │
│                          │ RealtimeGateway │                               │
│                          │   (Socket.IO)   │                               │
│                          └────────┬────────┘                               │
│                                   │                                         │
│              ┌────────────────────┼────────────────────┐                   │
│              │                    │                    │                   │
│              ▼                    ▼                    ▼                   │
│       ┌──────────┐         ┌──────────┐         ┌──────────┐              │
│       │ Client 1 │         │ Client 2 │         │ Client N │              │
│       │(Dashboard│         │(Dashboard│         │(Dashboard│              │
│       │    A)    │         │    A)    │         │    B)    │              │
│       └────┬─────┘         └────┬─────┘         └────┬─────┘              │
│            │                    │                    │                     │
│  4. Update widget UI            │                    │                     │
│            │                    │                    │                     │
│            ▼                    ▼                    ▼                     │
│       ┌──────────┐         ┌──────────┐         ┌──────────┐              │
│       │  Widget  │         │  Widget  │         │  Widget  │              │
│       │ Component│         │ Component│         │ Component│              │
│       │ (update) │         │ (update) │         │ (update) │              │
│       └──────────┘         └──────────┘         └──────────┘              │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 9.6 Connection States

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTION STATE MACHINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      ┌─────────────┐                            │
│          ┌──────────►│DISCONNECTED │◄──────────┐                │
│          │           └──────┬──────┘           │                │
│          │                  │                  │                │
│          │                  │ connect()        │ disconnect()   │
│          │                  │                  │ or error       │
│          │                  ▼                  │                │
│          │           ┌─────────────┐           │                │
│          │           │ CONNECTING  │───────────┘                │
│          │           └──────┬──────┘                            │
│          │                  │                                    │
│          │                  │ on('connect')                      │
│          │                  │                                    │
│          │                  ▼                                    │
│          │           ┌─────────────┐                            │
│          └───────────│  CONNECTED  │                            │
│       on('disconnect')└─────────────┘                            │
│                                                                  │
│  UI Indicators:                                                  │
│  • DISCONNECTED: Red dot, "Offline" badge                       │
│  • CONNECTING: Yellow dot, spinner                               │
│  • CONNECTED: Green dot, "Live" badge                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9.7 Scalability Considerations

### Redis Adapter (for multiple server instances)

```typescript
// For production with multiple NestJS instances

import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

// In main.ts
const app = await NestFactory.create(AppModule);
const redisIoAdapter = new RedisIoAdapter(app);
await redisIoAdapter.connectToRedis();
app.useWebSocketAdapter(redisIoAdapter);
```

### Rate Limiting

```typescript
// Limit message rate per client
const MESSAGE_RATE_LIMIT = 100; // messages per minute
const clientMessageCounts = new Map<string, number>();

setInterval(() => {
  clientMessageCounts.clear();
}, 60000);

function checkRateLimit(clientId: string): boolean {
  const count = clientMessageCounts.get(clientId) || 0;
  if (count >= MESSAGE_RATE_LIMIT) {
    return false;
  }
  clientMessageCounts.set(clientId, count + 1);
  return true;
}
```

---

## Navigation

⬅️ [Previous: API Specification](./08-API-SPECIFICATION.md) | [Back to Index](./00-INDEX.md) | [Next: Security](./10-SECURITY.md) ➡️
