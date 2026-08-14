import { Injectable } from '@nestjs/common';
import { QueryProfile, RoleCluster } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class QueryProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(): Promise<QueryProfile[]> {
    return this.prisma.queryProfile.findMany({
      where: { isActive: true },
      orderBy: [{ clusterHint: 'asc' }, { code: 'asc' }],
    });
  }

  findByCluster(clusterHint: RoleCluster): Promise<QueryProfile[]> {
    return this.prisma.queryProfile.findMany({
      where: { clusterHint, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  findByCodes(codes: string[]): Promise<QueryProfile[]> {
    return this.prisma.queryProfile.findMany({
      where: { code: { in: codes }, isActive: true },
      orderBy: { code: 'asc' },
    });
  }
}
