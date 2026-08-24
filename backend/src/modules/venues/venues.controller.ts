import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('Venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Admin: Create a new venue with structured grid seating layout' })
  @ApiResponse({ status: 201, description: 'Venue created successfully' })
  create(@Body() dto: CreateVenueDto) {
    return this.venuesService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all venues' })
  findAll() {
    return this.venuesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get venue details with full seating layout' })
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update venue configuration' })
  update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return this.venuesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete venue' })
  remove(@Param('id') id: string) {
    return this.venuesService.remove(id);
  }
}
