import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'hold-uuid-here', description: 'ID of the active hold being converted to booking' })
  @IsString()
  @IsNotEmpty()
  holdId: string;

  @ApiPropertyOptional({ example: 'CARD-4242', description: 'Mock payment method or gateway token' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
