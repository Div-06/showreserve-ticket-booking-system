import { IsString, IsNotEmpty, IsInt, Min, Max, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SeatCategory } from '@prisma/client';

export class CustomSeatConfigDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  rowLabel: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  colNumber: number;

  @ApiProperty({ example: 'A1' })
  @IsString()
  seatNumber: string;

  @ApiProperty({ enum: SeatCategory, default: SeatCategory.STANDARD })
  @IsString()
  category: SeatCategory;
}

export class CreateVenueDto {
  @ApiProperty({ example: 'Grand IMAX Theater' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'San Francisco' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '100 Metreon Promenade' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  @Max(26)
  totalRows: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  @Max(50)
  totalCols: number;

  @ApiPropertyOptional({ example: [3, 9], description: 'Column indices after which an aisle is placed' })
  @IsOptional()
  @IsArray()
  aisles?: number[] = [];

  @ApiPropertyOptional({
    type: [CustomSeatConfigDto],
    description: 'Optional custom seating layout specification. If omitted, default category matrix is auto-generated.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomSeatConfigDto)
  seats?: CustomSeatConfigDto[];
}
