import { Injectable } from '@nestjs/common';
import { QueryProfile, RoleCluster } from '@prisma/client';
import { QueryProfilesRepository } from './query-profiles.repository';

@Injectable()
export class QueryProfilesService {
  constructor(
    private readonly queryProfilesRepository: QueryProfilesRepository,
  ) {}

  listActive(): Promise<QueryProfile[]> {
    return this.queryProfilesRepository.findActive();
  }

  listByCluster(cluster: RoleCluster): Promise<QueryProfile[]> {
    return this.queryProfilesRepository.findByCluster(cluster);
  }

  listByCodes(codes: string[]): Promise<QueryProfile[]> {
    if (codes.length === 0) {
      return this.listActive();
    }
    return this.queryProfilesRepository.findByCodes(codes);
  }
}
