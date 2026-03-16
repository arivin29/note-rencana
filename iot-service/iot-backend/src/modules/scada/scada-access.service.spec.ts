import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { ScadaDiagram } from '../../entities/scada-diagram.entity';
import { ScadaAccessService } from './scada-access.service';

describe('ScadaAccessService', () => {
  let service: ScadaAccessService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let diagramRepository: jest.Mocked<Repository<ScadaDiagram>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScadaAccessService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ScadaDiagram),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScadaAccessService>(ScadaAccessService);
    projectRepository = module.get(getRepositoryToken(Project));
    diagramRepository = module.get(getRepositoryToken(ScadaDiagram));
  });

  it('returns tenant owner scope from user context', () => {
    expect(
      service.resolveOwnerScope(undefined, {
        idUser: 'user-1',
        idOwner: 'owner-1',
        role: 'tenant',
      }),
    ).toBe('owner-1');
  });

  it('rejects admin request without explicit owner scope', () => {
    expect(() =>
      service.resolveOwnerScope(undefined, {
        idUser: 'admin-1',
        role: 'admin',
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects tenant access when project belongs to a different owner', async () => {
    projectRepository.findOne.mockResolvedValue({
      idProject: 'project-1',
      idOwner: 'owner-2',
    } as Project);

    await expect(
      service.assertProjectAccess('project-1', 'owner-1', {
        idUser: 'user-1',
        idOwner: 'owner-1',
        role: 'tenant',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns diagram or throws when missing', async () => {
    diagramRepository.findOne.mockResolvedValue(null);

    await expect(service.getDiagramOrFail('diagram-1')).rejects.toThrow(NotFoundException);
  });
});
