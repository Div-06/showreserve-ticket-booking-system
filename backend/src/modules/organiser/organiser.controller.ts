import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganiserService } from './organiser.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Organiser')
@Controller('organiser')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANISER, Role.ADMIN)
@ApiBearerAuth('JWT-auth')
export class OrganiserController {
  constructor(private readonly organiserService: OrganiserService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Organiser: Get booking overview, revenue, and category breakdown' })
  getDashboardSummary(@CurrentUser('id') organiserId: string) {
    return this.organiserService.getDashboardSummary(organiserId);
  }
}
