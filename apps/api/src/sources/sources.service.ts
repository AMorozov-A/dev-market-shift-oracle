import { Injectable, NotFoundException } from '@nestjs/common';
import { Source } from '@prisma/client';
import { SourcesRepository } from './sources.repository';

@Injectable()
export class SourcesService {
  constructor(private readonly sourcesRepository: SourcesRepository) {}

  listActive(): Promise<Source[]> {
    return this.sourcesRepository.findActive();
  }

  async getByCodeOrThrow(code: string): Promise<Source> {
    const source = await this.sourcesRepository.findByCode(code);
    if (!source) {
      throw new NotFoundException(`Source not found: ${code}`);
    }
    return source;
  }
}
