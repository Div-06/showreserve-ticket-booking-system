import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WaitlistsService } from './waitlists.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Waitlists')
@Controller('waitlists')
export class WaitlistsController {
  constructor(private readonly waitlistsService: WaitlistsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Join category-specific FIFO waitlist for a sold-out or high-demand show' })
  @ApiResponse({ status: 201, description: 'Joined waitlist' })
  joinWaitlist(@Body() dto: JoinWaitlistDto, @CurrentUser('id') customerId: string) {
    return this.waitlistsService.joinWaitlist(dto, customerId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('my')
  @ApiOperation({ summary: 'Get current customer waitlist entries & active offers' })
  getMyWaitlists(@CurrentUser('id') customerId: string) {
    return this.waitlistsService.getCustomerWaitlists(customerId);
  }

  @Public()
  @Get('offers/:token')
  @ApiOperation({ summary: 'View waitlist offer details via secure email link token' })
  getOfferByToken(@Param('token') token: string) {
    return this.waitlistsService.getOfferByToken(token);
  }

  @Public()
  @Post('offers/accept')
  @ApiOperation({ summary: 'Accept a time-limited waitlist offer and convert to confirmed booking' })
  acceptOffer(@Body() dto: AcceptOfferDto) {
    return this.waitlistsService.acceptOffer(dto);
  }
}
