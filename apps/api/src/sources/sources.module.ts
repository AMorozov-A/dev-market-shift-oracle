import { Module } from '@nestjs/common';
import { JobicyClient } from './jobicy/jobicy.client';
import { RemoteOkClient } from './remoteok/remoteok.client';
import { SourcesRepository } from './sources.repository';
import { SourcesService } from './sources.service';
import { VacancySourceRegistry } from './vacancy-source.registry';

@Module({
  providers: [
    SourcesRepository,
    SourcesService,
    RemoteOkClient,
    JobicyClient,
    VacancySourceRegistry,
  ],
  exports: [
    SourcesRepository,
    SourcesService,
    RemoteOkClient,
    JobicyClient,
    VacancySourceRegistry,
  ],
})
export class SourcesModule {}
