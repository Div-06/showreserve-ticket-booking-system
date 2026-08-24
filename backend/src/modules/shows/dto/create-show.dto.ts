import { IsString, IsNotEmpty, IsDateString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShowDto {
  @ApiProperty({ example: 'event-uuid-here' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ example: 'venue-uuid-here' })
  @IsString()
  @IsNotEmpty()
  venueId: string;

  @ApiProperty({ example: '2026-08-25T18:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-08-25T21:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    example: { VIP: 45, PREMIUM: 28, STANDARD: 16 },
    description: 'Pricing per seat category',
  })
  @IsObject()
  pricing: Record<string, number>;
}
