import type {
  VacancyDetails,
  VacancySearchHit,
} from '../providers/vacancy-source-provider.interface';
import type { RemoteOkJob } from './remoteok.types';

function stripHtml(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return (
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}

export function mapRemoteOkSearchHit(
  job: RemoteOkJob,
): VacancySearchHit | null {
  if (job.id === undefined || job.id === null) {
    return null;
  }

  const externalId = String(job.id);
  return {
    externalId,
    url:
      job.url ??
      job.apply_url ??
      `https://remoteok.com/remote-jobs/${externalId}`,
    title: job.position ?? 'Untitled',
    publishedAt: job.date ?? new Date((job.epoch ?? 0) * 1000).toISOString(),
    description: stripHtml(job.description),
    keySkills: job.tags ?? [],
    employerName: job.company ?? null,
    raw: job,
  };
}

export function mapRemoteOkDetails(
  job: RemoteOkJob,
  meta: {
    requestUrl: string;
    requestParams: Record<string, unknown>;
    httpStatus: number;
  },
): VacancyDetails {
  const hit = mapRemoteOkSearchHit(job);
  if (!hit) {
    throw new Error('Invalid RemoteOK job payload');
  }

  return {
    externalId: hit.externalId,
    url: hit.url,
    title: hit.title,
    description: hit.description ?? null,
    keySkills: hit.keySkills ?? [],
    employerName: hit.employerName ?? null,
    areaId: null,
    areaName: job.location ?? null,
    publishedAt: hit.publishedAt,
    archived: false,
    employment: null,
    experience: null,
    schedule: null,
    salaryFrom: job.salary_min ?? null,
    salaryTo: job.salary_max ?? null,
    salaryCurrency: job.salary_min || job.salary_max ? 'USD' : null,
    salaryGross: null,
    requestUrl: meta.requestUrl,
    requestParams: meta.requestParams,
    httpStatus: meta.httpStatus,
    raw: job,
  };
}
