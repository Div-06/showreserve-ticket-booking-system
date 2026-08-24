import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { HoldsService } from './holds.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Holds')
@Controller('holds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post()
  @ApiOperation({ summary: 'Hold one or more seats for checkout with configurable TTL' })
  @ApiResponse({ status: 201, description: 'Seats held successfully' })
  @ApiResponse({ status: 409, description: 'One or more seats are unavailable or already held' })
  createHold(@Body() dto: CreateHoldDto, @CurrentUser('id') customerId: string) {
    return this.holdsService.createHold(dto, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hold status and remaining TTL' })
  findOne(@Param('id') id: string, @CurrentUser('id') customerId: string) {
    return this.holdsService.findOne(id, customerId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Release an active hold early' })
  releaseHold(@Param('id') id: string, @CurrentUser('id') customerId: string) {
    return this.holdsService.releaseHold(id, customerId);
  }
}
