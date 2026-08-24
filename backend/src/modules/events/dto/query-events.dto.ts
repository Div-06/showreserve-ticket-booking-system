import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory } from '@prisma/client';

export class QueryEventsDto {
  @ApiPropertyOptional({ description: 'Search term for title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EventCategory })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiPropertyOptional({ description: 'Filter events with shows at a specific venue ID' })
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional({ description: 'Filter events with shows in a specific city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter shows starting on or after this ISO date' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
