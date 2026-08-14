import { Injectable } from '@nestjs/common';
import { Source } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<Source | null> {
    return this.prisma.source.findUnique({ where: { code } });
  }

  findActive(): Promise<Source[]> {
    return this.prisma.source.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  findAll(): Promise<Source[]> {
    return this.prisma.source.findMany({
      orderBy: { code: 'asc' },
    });
  }
}
