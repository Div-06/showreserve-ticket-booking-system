import { Test, TestingModule } from '@nestjs/testing';
import { HoldsService } from './holds.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LockService } from '../../redis/lock.service';
import { QueueService } from '../../queues/queue.service';
import { EventsGateway } from '../../socket/events.gateway';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';

describe('HoldsService', () => {
  let service: HoldsService;
  let prisma: PrismaService;
  let lockService: LockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoldsService,
        {
          provide: PrismaService,
          useValue: {
            show: { findUnique: jest.fn() },
            $transaction: jest.fn(),
            hold: { findUnique: jest.fn() },
            showSeat: { findMany: jest.fn() },
          },
        },
        {
          provide: LockService,
          useValue: {
            acquireMultipleLocks: jest.fn(),
            releaseMultipleLocks: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            scheduleHoldExpiry: jest.fn(),
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            broadcastSeatUpdate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(600),
          },
        },
      ],
    }).compile();

    service = module.get<HoldsService>(HoldsService);
    prisma = module.get<PrismaService>(PrismaService);
    lockService = module.get<LockService>(LockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ConflictException if Redis lock acquisition fails', async () => {
    jest.spyOn(prisma.show, 'findUnique').mockResolvedValue({ id: 'show-1' } as any);
    jest.spyOn(lockService, 'acquireMultipleLocks').mockResolvedValue(null);

    await expect(
      service.createHold({ showId: 'show-1', showSeatIds: ['seat-1'] }, 'cust-1'),
    ).rejects.toThrow(ConflictException);
  });
});
