import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';

export interface ScadaRequestUser {
  idUser: string;
  idOwner?: string | null;
  role?: string;
}

@Injectable()
export class ScadaAccessService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ScadaDiagram)
    private readonly scadaDiagramRepository: Repository<ScadaDiagram>,
  ) {}

  isAdmin(user: ScadaRequestUser): boolean {
    return user.role === 'admin' || user.role === 'ADMIN';
  }

  resolveOwnerScope(ownerId: string | undefined, user: ScadaRequestUser): string {
    if (this.isAdmin(user)) {
      if (!ownerId) {
        throw new ForbiddenException('ownerId is required for admin requests');
      }

      return ownerId;
    }

    if (!user.idOwner) {
      throw new ForbiddenException('User is not associated with an owner');
    }

    if (ownerId && ownerId !== user.idOwner) {
      throw new ForbiddenException('Owner scope mismatch');
    }

    return user.idOwner;
  }

  async assertProjectAccess(projectId: string | null | undefined, ownerId: string, user: ScadaRequestUser): Promise<void> {
    if (!projectId) {
      return;
    }

    const project = await this.projectRepository.findOne({
      where: { idProject: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (!this.isAdmin(user) && project.idOwner !== ownerId) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  async getDiagramOrFail(diagramId: string): Promise<ScadaDiagram> {
    const diagram = await this.scadaDiagramRepository.findOne({
      where: { idScadaDiagram: diagramId },
    });

    if (!diagram) {
      throw new NotFoundException(`SCADA diagram with ID ${diagramId} not found`);
    }

    return diagram;
  }

  assertDiagramAccess(diagram: ScadaDiagram, user: ScadaRequestUser): void {
    if (this.isAdmin(user)) {
      return;
    }

    if (!user.idOwner || diagram.idOwner !== user.idOwner) {
      throw new ForbiddenException('You do not have access to this SCADA diagram');
    }
  }
}
