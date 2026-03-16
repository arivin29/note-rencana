import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScadaBindingOptionsController } from './scada-binding-options.controller';
import { ScadaBindingOptionsService } from './scada-binding-options.service';
import { ScadaDiagramsController } from './scada-diagrams.controller';
import { ScadaRuntimeController } from './scada-runtime.controller';
import { ScadaDiagramsService } from './scada-diagrams.service';
import { ScadaRuntimeService } from './scada-runtime.service';

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      idUser: 'user-1',
      idOwner: 'owner-1',
      role: 'tenant',
    };
    return true;
  }
}

describe('SCADA HTTP routes', () => {
  let app: INestApplication;
  const diagramId = '11111111-1111-1111-1111-111111111111';
  const projectId = '22222222-2222-2222-2222-222222222222';

  const diagramsServiceMock = {
    findAll: jest.fn().mockResolvedValue([
      {
        id: diagramId,
        ownerId: 'owner-1',
        projectId,
        name: 'Main Line',
        description: 'Diagram operasional',
        status: 'active',
        updatedAt: new Date().toISOString(),
        nodeCount: 1,
        edgeCount: 0,
      },
    ]),
    create: jest.fn().mockResolvedValue({
      diagram: {
        id: diagramId,
        ownerId: 'owner-1',
        projectId,
        name: 'Main Line',
        description: null,
        diagramCode: null,
        status: 'draft',
        canvasConfig: {},
        runtimeConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      nodes: [],
      edges: [],
    }),
    findOne: jest.fn().mockResolvedValue({
      diagram: {
        id: diagramId,
        ownerId: 'owner-1',
        projectId,
        name: 'Main Line',
        description: 'Diagram operasional',
        diagramCode: 'MAIN-LINE',
        status: 'active',
        canvasConfig: { zoom: 1 },
        runtimeConfig: { pollMs: 5000 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      nodes: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          type: 'pump',
          label: 'Pump A',
          position: { x: 100, y: 200 },
          size: { width: 120, height: 80 },
          rotationDeg: 0,
          zIndex: 1,
          relatedNodeId: null,
          relatedSensorId: null,
          style: {},
          config: {},
          bindings: [],
        },
      ],
      edges: [],
    }),
    update: jest.fn().mockResolvedValue({
      diagram: {
        id: diagramId,
        ownerId: 'owner-1',
        projectId,
        name: 'Main Line Updated',
        description: 'Updated',
        diagramCode: 'MAIN-LINE',
        status: 'active',
        canvasConfig: { zoom: 1.25 },
        runtimeConfig: { pollMs: 3000 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      nodes: [],
      edges: [],
    }),
    duplicate: jest.fn().mockResolvedValue({
      diagram: {
        id: '44444444-4444-4444-4444-444444444444',
        ownerId: 'owner-1',
        projectId,
        name: 'Main Line Copy',
        description: 'Diagram operasional',
        diagramCode: null,
        status: 'draft',
        canvasConfig: {},
        runtimeConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      nodes: [],
      edges: [],
    }),
    archive: jest.fn().mockResolvedValue({
      message: 'Diagram archived successfully',
    }),
  };

  const runtimeServiceMock = {
    getDiagramRuntime: jest.fn().mockResolvedValue({
      diagramId,
      polledAt: new Date().toISOString(),
      bindings: [],
    }),
  };

  const bindingOptionsServiceMock = {
    findAll: jest.fn().mockResolvedValue([
      {
        idSensorChannel: '55555555-5555-5555-5555-555555555555',
        metricCode: 'pressure',
        unit: 'bar',
        precision: 2,
        minThreshold: 1,
        maxThreshold: 8,
        sensor: {
          idSensor: '66666666-6666-6666-6666-666666666666',
          label: 'Pressure Sensor',
          sensorCode: 'PS-01',
          status: 'active',
        },
        node: {
          idNode: '77777777-7777-7777-7777-777777777777',
          code: 'NODE-01',
          name: 'Pump House',
        },
        project: {
          idProject: projectId,
          name: 'Project A',
        },
        sensorType: {
          idSensorType: '88888888-8888-8888-8888-888888888888',
          category: 'pressure',
          defaultUnit: 'bar',
          precision: 2,
        },
      },
    ]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ScadaDiagramsController, ScadaRuntimeController, ScadaBindingOptionsController],
      providers: [
        {
          provide: ScadaDiagramsService,
          useValue: diagramsServiceMock,
        },
        {
          provide: ScadaRuntimeService,
          useValue: runtimeServiceMock,
        },
        {
          provide: ScadaBindingOptionsService,
          useValue: bindingOptionsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /scada/diagrams returns diagram list', async () => {
    const response = await request(app.getHttpServer()).get('/scada/diagrams').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(diagramId);
    expect(diagramsServiceMock.findAll).toHaveBeenCalled();
  });

  it('POST /scada/diagrams creates a diagram', async () => {
    const response = await request(app.getHttpServer())
      .post('/scada/diagrams')
      .send({
        name: 'Main Line',
        projectId,
      })
      .expect(201);

    expect(response.body.diagram.id).toBe(diagramId);
    expect(diagramsServiceMock.create).toHaveBeenCalled();
  });

  it('GET /scada/diagrams/:id/runtime returns runtime payload', async () => {
    const response = await request(app.getHttpServer())
      .get(`/scada/diagrams/${diagramId}/runtime`)
      .expect(200);

    expect(response.body.diagramId).toBe(diagramId);
    expect(runtimeServiceMock.getDiagramRuntime).toHaveBeenCalled();
  });

  it('GET /scada/diagrams/:id returns diagram detail', async () => {
    const response = await request(app.getHttpServer())
      .get(`/scada/diagrams/${diagramId}`)
      .expect(200);

    expect(response.body.diagram.id).toBe(diagramId);
    expect(response.body.nodes).toHaveLength(1);
    expect(diagramsServiceMock.findOne).toHaveBeenCalledWith(diagramId, expect.any(Object));
  });

  it('PUT /scada/diagrams/:id updates a full diagram payload', async () => {
    const response = await request(app.getHttpServer())
      .put(`/scada/diagrams/${diagramId}`)
      .send({
        diagram: {
          name: 'Main Line Updated',
          description: 'Updated',
          projectId,
          diagramCode: 'MAIN-LINE',
          status: 'active',
          canvasConfig: { zoom: 1.25 },
          runtimeConfig: { pollMs: 3000 },
        },
        nodes: [],
        edges: [],
      })
      .expect(200);

    expect(response.body.diagram.name).toBe('Main Line Updated');
    expect(diagramsServiceMock.update).toHaveBeenCalledWith(
      diagramId,
      expect.objectContaining({
        diagram: expect.objectContaining({
          name: 'Main Line Updated',
        }),
      }),
      expect.any(Object),
    );
  });

  it('POST /scada/diagrams/:id/duplicate duplicates a diagram', async () => {
    const response = await request(app.getHttpServer())
      .post(`/scada/diagrams/${diagramId}/duplicate`)
      .send({
        name: 'Main Line Copy',
        projectId,
      })
      .expect(201);

    expect(response.body.diagram.name).toBe('Main Line Copy');
    expect(diagramsServiceMock.duplicate).toHaveBeenCalledWith(
      diagramId,
      expect.objectContaining({
        name: 'Main Line Copy',
      }),
      expect.any(Object),
    );
  });

  it('DELETE /scada/diagrams/:id archives a diagram', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/scada/diagrams/${diagramId}`)
      .expect(200);

    expect(response.body).toEqual({ message: 'Diagram archived successfully' });
    expect(diagramsServiceMock.archive).toHaveBeenCalledWith(diagramId, expect.any(Object));
  });

  it('GET /scada/binding-options returns bindable sensor channels', async () => {
    const response = await request(app.getHttpServer())
      .get(`/scada/binding-options?projectId=${projectId}&search=pressure`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].metricCode).toBe('pressure');
    expect(bindingOptionsServiceMock.findAll).toHaveBeenCalled();
  });
});
