import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaEdge } from '../../entities/scada-edge.entity';
import { ScadaNode } from '../../entities/scada-node.entity';
import { ScadaNodeBinding } from '../../entities/scada-node-binding.entity';
import { SensorChannel } from '../../entities/sensor-channel.entity';
import {
  CreateScadaDiagramDto,
  DuplicateScadaDiagramDto,
  ListScadaDiagramsQueryDto,
  ScadaBindingPayloadDto,
  ScadaDiagramDetailResponseDto,
  ScadaDiagramListItemResponseDto,
  ScadaEdgePayloadDto,
  ScadaNodePayloadDto,
  UpdateScadaDiagramDto,
} from './dto';
import { ScadaAccessService, ScadaRequestUser } from './scada-access.service';
import { ScadaMapperService } from './scada-mapper.service';

const VALID_DIAGRAM_STATUSES = new Set(['draft', 'active', 'archived']);

@Injectable()
export class ScadaDiagramsService {
  constructor(
    @InjectRepository(ScadaDiagram)
    private readonly scadaDiagramRepository: Repository<ScadaDiagram>,
    @InjectRepository(ScadaNode)
    private readonly scadaNodeRepository: Repository<ScadaNode>,
    @InjectRepository(ScadaEdge)
    private readonly scadaEdgeRepository: Repository<ScadaEdge>,
    @InjectRepository(ScadaNodeBinding)
    private readonly scadaNodeBindingRepository: Repository<ScadaNodeBinding>,
    @InjectRepository(SensorChannel)
    private readonly sensorChannelRepository: Repository<SensorChannel>,
    private readonly dataSource: DataSource,
    private readonly scadaAccessService: ScadaAccessService,
    private readonly scadaMapperService: ScadaMapperService,
  ) {}

  async findAll(
    query: ListScadaDiagramsQueryDto,
    user: ScadaRequestUser,
  ): Promise<ScadaDiagramListItemResponseDto[]> {
    const ownerId = this.scadaAccessService.resolveOwnerScope(query.ownerId, user);

    if (query.projectId) {
      await this.scadaAccessService.assertProjectAccess(query.projectId, ownerId, user);
    }

    const queryBuilder = this.scadaDiagramRepository
      .createQueryBuilder('diagram')
      .leftJoin('diagram.nodes', 'node')
      .leftJoin('diagram.edges', 'edge')
      .where('diagram.idOwner = :ownerId', { ownerId })
      .andWhere('diagram.isActive = true')
      .select([
        'diagram.idScadaDiagram AS "id"',
        'diagram.idOwner AS "ownerId"',
        'diagram.idProject AS "projectId"',
        'diagram.name AS "name"',
        'diagram.description AS "description"',
        'diagram.status AS "status"',
        'diagram.updatedAt AS "updatedAt"',
        'COUNT(DISTINCT node.idScadaNode) AS "nodeCount"',
        'COUNT(DISTINCT edge.idScadaEdge) AS "edgeCount"',
      ])
      .groupBy('diagram.idScadaDiagram')
      .orderBy('diagram.updatedAt', 'DESC');

    if (query.projectId) {
      queryBuilder.andWhere('diagram.idProject = :projectId', { projectId: query.projectId });
    }

    if (query.status) {
      queryBuilder.andWhere('diagram.status = :status', { status: query.status });
    } else {
      queryBuilder.andWhere(`diagram.status != 'archived'`);
    }

    const rows = await queryBuilder.getRawMany();

    return rows.map((row) =>
      this.scadaMapperService.toListItem(
        {
          idScadaDiagram: row.id,
          idOwner: row.ownerId,
          idProject: row.projectId,
          name: row.name,
          description: row.description,
          status: row.status,
          updatedAt: new Date(row.updatedAt),
        } as ScadaDiagram,
        {
          nodeCount: Number(row.nodeCount),
          edgeCount: Number(row.edgeCount),
        },
      ),
    );
  }

  async create(
    dto: CreateScadaDiagramDto,
    user: ScadaRequestUser,
  ): Promise<ScadaDiagramDetailResponseDto> {
    const ownerId = this.scadaAccessService.resolveOwnerScope(dto.ownerId, user);
    await this.scadaAccessService.assertProjectAccess(dto.projectId, ownerId, user);
    await this.ensureDiagramCodeAvailable(ownerId, dto.diagramCode ?? null);

    const saved = await this.scadaDiagramRepository.save(
      this.scadaDiagramRepository.create({
        idOwner: ownerId,
        idProject: dto.projectId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        diagramCode: dto.diagramCode ?? null,
        status: dto.status ?? 'draft',
        canvasConfig: dto.canvasConfig ?? {},
        runtimeConfig: dto.runtimeConfig ?? {},
        isActive: true,
        createdBy: user.idUser,
        updatedBy: user.idUser,
      }),
    );

    return this.findOne(saved.idScadaDiagram, user);
  }

  async findOne(diagramId: string, user: ScadaRequestUser): Promise<ScadaDiagramDetailResponseDto> {
    const diagram = await this.loadDiagramGraph(diagramId);
    this.scadaAccessService.assertDiagramAccess(diagram, user);
    return this.scadaMapperService.toDiagramDetail(diagram);
  }

  async update(
    diagramId: string,
    dto: UpdateScadaDiagramDto,
    user: ScadaRequestUser,
  ): Promise<ScadaDiagramDetailResponseDto> {
    const diagram = await this.loadDiagramGraph(diagramId);
    this.scadaAccessService.assertDiagramAccess(diagram, user);
    await this.scadaAccessService.assertProjectAccess(dto.diagram.projectId, diagram.idOwner, user);
    await this.validateUpdatePayload(dto);
    await this.ensureDiagramCodeAvailable(diagram.idOwner, dto.diagram.diagramCode ?? null, diagram.idScadaDiagram);

    await this.dataSource.transaction(async (manager) => {
      const diagramRepository = manager.getRepository(ScadaDiagram);
      const nodeRepository = manager.getRepository(ScadaNode);
      const edgeRepository = manager.getRepository(ScadaEdge);
      const bindingRepository = manager.getRepository(ScadaNodeBinding);

      Object.assign(diagram, {
        name: dto.diagram.name,
        description: dto.diagram.description ?? null,
        idProject: dto.diagram.projectId ?? null,
        diagramCode: dto.diagram.diagramCode ?? null,
        status: dto.diagram.status ?? diagram.status,
        canvasConfig: dto.diagram.canvasConfig ?? {},
        runtimeConfig: dto.diagram.runtimeConfig ?? {},
        updatedBy: user.idUser,
      });
      await diagramRepository.save(diagram);

      const existingNodes = new Map(diagram.nodes.map((node) => [node.idScadaNode, node]));
      const retainedNodeIds = new Set<string>();

      for (const nodePayload of dto.nodes) {
        const nodeEntity = nodePayload.id ? existingNodes.get(nodePayload.id) : undefined;
        const savedNode = await nodeRepository.save(
          nodeRepository.create({
            ...(nodeEntity || {}),
            idScadaNode: nodePayload.id ?? nodeEntity?.idScadaNode,
            idScadaDiagram: diagram.idScadaDiagram,
            nodeType: nodePayload.type,
            label: nodePayload.label,
            positionX: nodePayload.position.x,
            positionY: nodePayload.position.y,
            width: nodePayload.size.width,
            height: nodePayload.size.height,
            rotationDeg: nodePayload.rotationDeg ?? null,
            zIndex: nodePayload.zIndex ?? 0,
            idRelatedNode: nodePayload.relatedNodeId ?? null,
            idRelatedSensor: nodePayload.relatedSensorId ?? null,
            styleJson: nodePayload.style ?? {},
            configJson: nodePayload.config ?? {},
            isActive: true,
          }),
        );

        retainedNodeIds.add(savedNode.idScadaNode);
        await this.syncBindingsForNode(bindingRepository, savedNode.idScadaNode, nodePayload.bindings || []);
      }

      const removedNodeIds = diagram.nodes
        .map((node) => node.idScadaNode)
        .filter((id) => !retainedNodeIds.has(id));

      if (removedNodeIds.length > 0) {
        await edgeRepository.delete([
          { sourceNodeId: In(removedNodeIds) as any } as any,
          { targetNodeId: In(removedNodeIds) as any } as any,
        ]);
        await nodeRepository.delete({ idScadaNode: In(removedNodeIds) });
      }

      await this.syncEdgesForDiagram(edgeRepository, diagram.idScadaDiagram, dto.edges || []);
    });

    return this.findOne(diagramId, user);
  }

  async duplicate(
    diagramId: string,
    dto: DuplicateScadaDiagramDto,
    user: ScadaRequestUser,
  ): Promise<ScadaDiagramDetailResponseDto> {
    const source = await this.loadDiagramGraph(diagramId);
    this.scadaAccessService.assertDiagramAccess(source, user);
    await this.scadaAccessService.assertProjectAccess(dto.projectId ?? source.idProject, source.idOwner, user);

    const createdDiagramId = await this.dataSource.transaction(async (manager) => {
      const diagramRepository = manager.getRepository(ScadaDiagram);
      const nodeRepository = manager.getRepository(ScadaNode);
      const edgeRepository = manager.getRepository(ScadaEdge);
      const bindingRepository = manager.getRepository(ScadaNodeBinding);

      const clonedDiagram = await diagramRepository.save(
        diagramRepository.create({
          idOwner: source.idOwner,
          idProject: dto.projectId ?? source.idProject,
          name: dto.name,
          description: source.description,
          diagramCode: null,
          status: 'draft',
          canvasConfig: source.canvasConfig || {},
          runtimeConfig: source.runtimeConfig || {},
          isActive: true,
          createdBy: user.idUser,
          updatedBy: user.idUser,
        }),
      );

      const nodeIdMap = new Map<string, string>();

      for (const node of source.nodes) {
        const clonedNode = await nodeRepository.save(
          nodeRepository.create({
            idScadaDiagram: clonedDiagram.idScadaDiagram,
            nodeType: node.nodeType,
            label: node.label,
            positionX: node.positionX,
            positionY: node.positionY,
            width: node.width,
            height: node.height,
            rotationDeg: node.rotationDeg,
            zIndex: node.zIndex,
            idRelatedNode: node.idRelatedNode,
            idRelatedSensor: node.idRelatedSensor,
            styleJson: node.styleJson,
            configJson: node.configJson,
            isActive: true,
          }),
        );

        nodeIdMap.set(node.idScadaNode, clonedNode.idScadaNode);

        if (node.bindings?.length) {
          await bindingRepository.save(
            node.bindings.map((binding) =>
              bindingRepository.create({
                idScadaNode: clonedNode.idScadaNode,
                bindingKey: binding.bindingKey,
                idSensorChannel: binding.idSensorChannel,
                displayLabel: binding.displayLabel,
                unitOverride: binding.unitOverride,
                transformJson: binding.transformJson,
                priorityOrder: binding.priorityOrder,
                isPrimary: binding.isPrimary,
                showTrend: binding.showTrend ?? false,
                trendHours: binding.trendHours ?? 1,
                isActive: true,
              }),
            ),
          );
        }
      }

      if (source.edges?.length) {
        await edgeRepository.save(
          source.edges.map((edge) =>
            edgeRepository.create({
              idScadaDiagram: clonedDiagram.idScadaDiagram,
              sourceNodeId: nodeIdMap.get(edge.sourceNodeId)!,
              targetNodeId: nodeIdMap.get(edge.targetNodeId)!,
              edgeType: edge.edgeType,
              label: edge.label,
              pipeType: edge.pipeType,
              flowDirection: edge.flowDirection,
              animated: edge.animated,
              styleJson: edge.styleJson,
              configJson: edge.configJson,
              isActive: true,
            }),
          ),
        );
      }

      return clonedDiagram.idScadaDiagram;
    });

    return this.findOne(createdDiagramId, user);
  }

  async archive(diagramId: string, user: ScadaRequestUser): Promise<{ message: string }> {
    const diagram = await this.scadaAccessService.getDiagramOrFail(diagramId);
    this.scadaAccessService.assertDiagramAccess(diagram, user);

    diagram.status = 'archived';
    diagram.isActive = false;
    diagram.updatedBy = user.idUser;
    await this.scadaDiagramRepository.save(diagram);

    return { message: 'Diagram archived successfully' };
  }

  private async loadDiagramGraph(diagramId: string): Promise<ScadaDiagram> {
    const diagram = await this.scadaDiagramRepository.findOne({
      where: { idScadaDiagram: diagramId },
      relations: ['nodes', 'nodes.bindings', 'edges'],
    });

    if (!diagram) {
      throw new NotFoundException(`SCADA diagram with ID ${diagramId} not found`);
    }

    return diagram;
  }

  private async ensureDiagramCodeAvailable(
    ownerId: string,
    diagramCode: string | null,
    excludeDiagramId?: string,
  ): Promise<void> {
    if (!diagramCode) {
      return;
    }

    const existing = await this.scadaDiagramRepository.findOne({
      where: {
        idOwner: ownerId,
        diagramCode,
      },
    });

    if (existing && existing.idScadaDiagram !== excludeDiagramId) {
      throw new BadRequestException(`Diagram code '${diagramCode}' is already used for this owner`);
    }
  }

  private async validateUpdatePayload(dto: UpdateScadaDiagramDto): Promise<void> {
    if (!dto.nodes.length) {
      throw new BadRequestException('At least one node is required in full diagram save payload');
    }

    if (dto.diagram.status && !VALID_DIAGRAM_STATUSES.has(dto.diagram.status)) {
      throw new BadRequestException('Diagram status must be one of: draft, active, archived');
    }

    const nodeIds = dto.nodes.map((node) => {
      if (!node.id) {
        throw new BadRequestException('Each node must include a stable UUID id');
      }

      if (!node.label.trim()) {
        throw new BadRequestException('Node label is required');
      }

      if (node.size.width <= 0 || node.size.height <= 0) {
        throw new BadRequestException('Node size must be greater than zero');
      }

      return node.id;
    });

    if (new Set(nodeIds).size !== nodeIds.length) {
      throw new BadRequestException('Node IDs must be unique');
    }

    const edgeIds = (dto.edges || []).map((edge) => {
      if (!edge.id) {
        throw new BadRequestException('Each edge must include a stable UUID id');
      }

      if (edge.source === edge.target) {
        throw new BadRequestException('Edge source and target cannot be the same node');
      }

      return edge.id;
    });

    if (new Set(edgeIds).size !== edgeIds.length) {
      throw new BadRequestException('Edge IDs must be unique');
    }

    const bindingIds = dto.nodes
      .flatMap((node) => node.bindings || [])
      .map((binding) => binding.id)
      .filter((value): value is string => Boolean(value));
    if (new Set(bindingIds).size !== bindingIds.length) {
      throw new BadRequestException('Binding IDs must be unique');
    }

    const payloadNodeIds = new Set(nodeIds);
    for (const edge of dto.edges || []) {
      if (!payloadNodeIds.has(edge.source) || !payloadNodeIds.has(edge.target)) {
        throw new BadRequestException('Edge source/target must reference existing node IDs');
      }
    }

    for (const node of dto.nodes) {
      const bindingKeys = new Set<string>();
      for (const binding of node.bindings || []) {
        if (!binding.bindingKey.trim()) {
          throw new BadRequestException(`Binding key is required for node ${node.id}`);
        }

        const bindingKeyScope = `${binding.bindingKey}::${binding.sensorChannelId}`;
        if (bindingKeys.has(bindingKeyScope)) {
          throw new BadRequestException(`Duplicate binding detected for node ${node.id}`);
        }

        bindingKeys.add(bindingKeyScope);
      }
    }

    const sensorChannelIds = [
      ...new Set(
        dto.nodes
          .flatMap((node) => node.bindings || [])
          .map((binding) => binding.sensorChannelId),
      ),
    ];

    if (sensorChannelIds.length === 0) {
      return;
    }

    const count = await this.sensorChannelRepository.count({
      where: { idSensorChannel: In(sensorChannelIds) },
    });

    if (count !== sensorChannelIds.length) {
      throw new BadRequestException('One or more sensorChannelId values are invalid');
    }
  }

  private async syncBindingsForNode(
    bindingRepository: Repository<ScadaNodeBinding>,
    nodeId: string,
    bindings: ScadaBindingPayloadDto[],
  ): Promise<void> {
    const existingBindings = await bindingRepository.find({
      where: { idScadaNode: nodeId },
    });

    const existingMap = new Map(existingBindings.map((binding) => [binding.idScadaNodeBinding, binding]));
    const retainedIds = new Set<string>();

    for (const bindingPayload of bindings) {
      const existingBinding = bindingPayload.id ? existingMap.get(bindingPayload.id) : undefined;
      const savedBinding = await bindingRepository.save(
        bindingRepository.create({
          ...(existingBinding || {}),
          idScadaNodeBinding: bindingPayload.id ?? existingBinding?.idScadaNodeBinding,
          idScadaNode: nodeId,
          bindingKey: bindingPayload.bindingKey,
          idSensorChannel: bindingPayload.sensorChannelId,
          displayLabel: bindingPayload.displayLabel ?? null,
          unitOverride: bindingPayload.unitOverride ?? null,
          transformJson: bindingPayload.transform ?? null,
          priorityOrder: bindingPayload.priorityOrder ?? 0,
          isPrimary: bindingPayload.isPrimary ?? false,
          showTrend: bindingPayload.showTrend ?? false,
          trendHours: bindingPayload.trendHours ?? 1,
          isActive: true,
        }),
      );

      retainedIds.add(savedBinding.idScadaNodeBinding);
    }

    const removedIds = existingBindings
      .map((binding) => binding.idScadaNodeBinding)
      .filter((id) => !retainedIds.has(id));

    if (removedIds.length > 0) {
      await bindingRepository.delete({ idScadaNodeBinding: In(removedIds) });
    }
  }

  private async syncEdgesForDiagram(
    edgeRepository: Repository<ScadaEdge>,
    diagramId: string,
    edges: ScadaEdgePayloadDto[],
  ): Promise<void> {
    const existingEdges = await edgeRepository.find({
      where: { idScadaDiagram: diagramId },
    });
    const existingMap = new Map(existingEdges.map((edge) => [edge.idScadaEdge, edge]));
    const retainedIds = new Set<string>();

    for (const edgePayload of edges) {
      const existingEdge = edgePayload.id ? existingMap.get(edgePayload.id) : undefined;
      const savedEdge = await edgeRepository.save(
        edgeRepository.create({
          ...(existingEdge || {}),
          idScadaEdge: edgePayload.id ?? existingEdge?.idScadaEdge,
          idScadaDiagram: diagramId,
          sourceNodeId: edgePayload.source,
          targetNodeId: edgePayload.target,
          edgeType: edgePayload.edgeType ?? 'pipe',
          label: edgePayload.label ?? null,
          pipeType: edgePayload.pipeType ?? null,
          flowDirection: edgePayload.flowDirection ?? null,
          animated: edgePayload.animated ?? false,
          styleJson: edgePayload.style ?? {},
          configJson: edgePayload.config ?? {},
          isActive: true,
        }),
      );

      retainedIds.add(savedEdge.idScadaEdge);
    }

    const removedIds = existingEdges
      .map((edge) => edge.idScadaEdge)
      .filter((id) => !retainedIds.has(id));

    if (removedIds.length > 0) {
      await edgeRepository.delete({ idScadaEdge: In(removedIds) });
    }
  }
}
