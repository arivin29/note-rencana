import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NodeAssignment } from '../../entities/node-assignment.entity';
import { CreateNodeAssignmentDto } from './dto/create-node-assignment.dto';
import { UpdateNodeAssignmentDto } from './dto/update-node-assignment.dto';
import { NodeAssignmentResponseDto } from './dto/node-assignment-response.dto';

@Injectable()
export class NodeAssignmentsService {
  constructor(
    @InjectRepository(NodeAssignment)
    private nodeAssignmentRepository: Repository<NodeAssignment>,
  ) {}

  async create(createDto: CreateNodeAssignmentDto): Promise<NodeAssignmentResponseDto> {
    const assignment = this.nodeAssignmentRepository.create(createDto);
    const saved = await this.nodeAssignmentRepository.save(assignment);
    return this.toResponseDto(saved);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    idNode?: string;
    idProject?: string;
    idOwner?: string;
  }): Promise<{ data: NodeAssignmentResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.nodeAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.node', 'node')
      .leftJoinAndSelect('assignment.project', 'project')
      .leftJoinAndSelect('assignment.owner', 'owner')
      .leftJoinAndSelect('assignment.nodeLocation', 'location');

    if (options?.idNode) {
      queryBuilder.andWhere('assignment.idNode = :idNode', { idNode: options.idNode });
    }

    if (options?.idProject) {
      queryBuilder.andWhere('assignment.idProject = :idProject', { idProject: options.idProject });
    }

    if (options?.idOwner) {
      queryBuilder.andWhere('assignment.idOwner = :idOwner', { idOwner: options.idOwner });
    }

    const [assignments, total] = await queryBuilder
      .orderBy('assignment.startAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: assignments.map((assignment) => this.toResponseDto(assignment)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<NodeAssignmentResponseDto> {
    const assignment = await this.nodeAssignmentRepository.findOne({
      where: { idNodeAssignment: id },
      relations: ['node', 'project', 'owner', 'nodeLocation'],
    });

    if (!assignment) {
      throw new NotFoundException(`Node assignment with ID ${id} not found`);
    }

    return this.toResponseDto(assignment);
  }

  async update(id: string, updateDto: UpdateNodeAssignmentDto): Promise<NodeAssignmentResponseDto> {
    const assignment = await this.nodeAssignmentRepository.findOne({
      where: { idNodeAssignment: id },
    });

    if (!assignment) {
      throw new NotFoundException(`Node assignment with ID ${id} not found`);
    }

    Object.assign(assignment, updateDto);
    const updated = await this.nodeAssignmentRepository.save(assignment);
    return this.toResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    const assignment = await this.nodeAssignmentRepository.findOne({
      where: { idNodeAssignment: id },
    });

    if (!assignment) {
      throw new NotFoundException(`Node assignment with ID ${id} not found`);
    }

    await this.nodeAssignmentRepository.remove(assignment);
  }

  private toResponseDto(assignment: NodeAssignment): NodeAssignmentResponseDto {
    const dto: NodeAssignmentResponseDto = {
      idNodeAssignment: assignment.idNodeAssignment,
      idNode: assignment.idNode,
      idProject: assignment.idProject,
      idOwner: assignment.idOwner,
      idNodeLocation: assignment.idNodeLocation,
      startAt: assignment.startAt,
      endAt: assignment.endAt,
      reason: assignment.reason,
      assignedBy: assignment.assignedBy,
      ticketRef: assignment.ticketRef,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };

    if (assignment.node) {
      dto.node = {
        idNode: assignment.node.idNode,
        code: assignment.node.code,
        serialNumber: assignment.node.serialNumber,
      };
    }

    if (assignment.project) {
      dto.project = {
        idProject: assignment.project.idProject,
        name: assignment.project.name,
      };
    }

    if (assignment.owner) {
      dto.owner = {
        idOwner: assignment.owner.idOwner,
        name: assignment.owner.name,
      };
    }

    if (assignment.nodeLocation) {
      dto.nodeLocation = {
        idNodeLocation: assignment.nodeLocation.idNodeLocation,
        address: assignment.nodeLocation.address,
      };
    }

    return dto;
  }
}
