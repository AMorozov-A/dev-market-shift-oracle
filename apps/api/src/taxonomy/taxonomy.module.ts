import { Module } from '@nestjs/common';
import { QueryProfilesRepository } from './query-profiles.repository';
import { QueryProfilesService } from './query-profiles.service';
import { RoleClassifierService } from './role-classifier.service';

@Module({
  providers: [
    QueryProfilesRepository,
    QueryProfilesService,
    RoleClassifierService,
  ],
  exports: [
    QueryProfilesRepository,
    QueryProfilesService,
    RoleClassifierService,
  ],
})
export class TaxonomyModule {}
