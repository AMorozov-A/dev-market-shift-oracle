import { Injectable } from '@nestjs/common';
import { JobicyClient } from './jobicy/jobicy.client';
import type { VacancySourceProvider } from './providers/vacancy-source-provider.interface';
import { RemoteOkClient } from './remoteok/remoteok.client';

@Injectable()
export class VacancySourceRegistry {
  private readonly providers: Map<string, VacancySourceProvider>;

  constructor(remoteOkClient: RemoteOkClient, jobicyClient: JobicyClient) {
    this.providers = new Map<string, VacancySourceProvider>([
      [remoteOkClient.code, remoteOkClient],
      [jobicyClient.code, jobicyClient],
    ]);
  }

  get(code: string): VacancySourceProvider {
    const provider = this.providers.get(code);
    if (!provider) {
      throw new Error(`Unknown vacancy source provider: ${code}`);
    }
    return provider;
  }

  list(): VacancySourceProvider[] {
    return [...this.providers.values()];
  }
}
