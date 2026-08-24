import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptOfferDto {
  @ApiProperty({ description: 'Secure 1-click token sent in waitlist notification email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ example: 'CARD-4242' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
