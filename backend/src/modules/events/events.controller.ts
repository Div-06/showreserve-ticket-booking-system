import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANISER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Organiser/Admin: Create a new movie or concert event listing' })
  @ApiResponse({ status: 201, description: 'Event created' })
  create(@Body() dto: CreateEventDto, @CurrentUser('id') userId: string) {
    return this.eventsService.create(dto, userId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Browse and filter events with shows' })
  findAll(@Query() query: QueryEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get event details with shows and venues' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANISER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Organiser/Admin: Update event details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.eventsService.update(id, dto, userId, userRole);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANISER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Organiser/Admin: Delete event' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.eventsService.remove(id, userId, userRole);
  }
}
