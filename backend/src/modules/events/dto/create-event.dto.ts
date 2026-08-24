import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ example: 'Interstellar: 10th Anniversary IMAX Experience' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Christopher Nolan\'s sci-fi epic masterpiece' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: EventCategory, default: EventCategory.MOVIE })
  @IsEnum(EventCategory)
  category: EventCategory;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86' })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiProperty({ example: 169, description: 'Duration in minutes' })
  @IsInt()
  @Min(1)
  durationMinutes: number;
}
