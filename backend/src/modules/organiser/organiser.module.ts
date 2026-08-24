import { Module } from '@nestjs/common';
import { OrganiserService } from './organiser.service';
import { OrganiserController } from './organiser.controller';

@Module({
  controllers: [OrganiserController],
  providers: [OrganiserService],
  exports: [OrganiserService],
})
export class OrganiserModule {}
