import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHoldDto {
  @ApiProperty({ example: 'show-uuid-here' })
  @IsString()
  @IsNotEmpty()
  showId: string;

  @ApiProperty({
    example: ['show-seat-uuid-1', 'show-seat-uuid-2'],
    description: 'List of ShowSeat IDs to hold',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one seat must be selected' })
  @IsString({ each: true })
  showSeatIds: string[];
}
