import { PartialType } from '@nestjs/swagger';
import { CreateUserDashboardDto } from './create-user-dashboard.dto';

export class UpdateUserDashboardDto extends PartialType(CreateUserDashboardDto) {}
