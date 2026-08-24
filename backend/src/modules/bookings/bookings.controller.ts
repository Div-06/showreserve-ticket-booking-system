import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Convert an active hold into a confirmed booking with QR code ticket' })
  @ApiResponse({ status: 201, description: 'Booking confirmed and tickets issued' })
  @ApiResponse({ status: 409, description: 'Hold is expired or seats no longer available' })
  createBooking(@Body() dto: CreateBookingDto, @CurrentUser('id') customerId: string) {
    return this.bookingsService.createBooking(dto, customerId);
  }

  @Get()
  @ApiOperation({ summary: 'Get booking history for the current customer' })
  findMyBookings(@CurrentUser('id') customerId: string) {
    return this.bookingsService.findAllForCustomer(customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') customerId: string) {
    return this.bookingsService.findOne(id, customerId);
  }

  @Get('reference/:ref')
  @ApiOperation({ summary: 'Find booking by unique booking reference (e.g. TKT-9F8A2B1C)' })
  findByReference(@Param('ref') ref: string) {
    return this.bookingsService.findByReference(ref);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking and automatically reallocate seats to FIFO waitlist customers' })
  @ApiResponse({ status: 200, description: 'Booking cancelled and seats reallocated' })
  cancelBooking(@Param('id') id: string, @CurrentUser('id') customerId: string) {
    return this.bookingsService.cancelBooking(id, customerId);
  }
}
