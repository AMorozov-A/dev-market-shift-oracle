import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;
  const checkMock = jest.fn().mockResolvedValue({ status: 'ok', details: {} });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: checkMock,
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns liveness result', async () => {
    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      details: {},
    });
    expect(checkMock).toHaveBeenCalled();
  });
});
