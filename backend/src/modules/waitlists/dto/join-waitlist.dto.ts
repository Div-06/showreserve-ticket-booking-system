import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SeatCategory } from '@prisma/client';

export class JoinWaitlistDto {
  @ApiProperty({ example: 'show-uuid-here' })
  @IsString()
  @IsNotEmpty()
  showId: string;

  @ApiProperty({ enum: SeatCategory, example: SeatCategory.PREMIUM })
  @IsEnum(SeatCategory)
  category: SeatCategory;
}
