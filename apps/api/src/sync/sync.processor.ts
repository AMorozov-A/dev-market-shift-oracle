import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MARKET_SYNC_QUEUE, RUN_SYNC_JOB } from './sync.service';
import { SyncPipelineService } from './sync.pipeline.service';

@Processor(MARKET_SYNC_QUEUE, {
  concurrency: 1,
})
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncPipelineService: SyncPipelineService) {
    super();
  }

  async process(job: Job<{ syncRunId: string }>): Promise<void> {
    if (job.name !== RUN_SYNC_JOB) {
      this.logger.warn(`Ignoring unknown job name: ${job.name}`);
      return;
    }

    this.logger.log(`Processing ${job.name} for syncRun=${job.data.syncRunId}`);
    await job.updateProgress(5);
    await this.syncPipelineService.run(job.data.syncRunId);
    await job.updateProgress(100);
  }
}
