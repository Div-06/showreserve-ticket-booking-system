import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ShowsService } from './shows.service';
import { CreateShowDto } from './dto/create-show.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('Shows')
@Controller('shows')
export class ShowsController {
  constructor(private readonly showsService: ShowsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANISER, Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Organiser/Admin: Create a new show for an event at a venue' })
  @ApiResponse({ status: 201, description: 'Show created with all ShowSeats initialized' })
  create(@Body() dto: CreateShowDto) {
    return this.showsService.create(dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get show overview details' })
  findOne(@Param('id') id: string) {
    return this.showsService.findOne(id);
  }

  @Public()
  @Get(':id/seats')
  @ApiOperation({ summary: 'Get visual seat map with real-time seat availability & pricing' })
  getShowSeats(@Param('id') id: string, @Req() req: any) {
    // Optionally extract user from Authorization header if present
    const authHeader = req.headers?.authorization;
    let userId: string | undefined = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        if (decoded && decoded.sub) userId = decoded.sub;
      } catch (e) {
        // ignore
      }
    }
    return this.showsService.getShowSeats(id, userId);
  }
}
