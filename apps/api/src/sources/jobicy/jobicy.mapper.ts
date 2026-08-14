import type {
  VacancyDetails,
  VacancySearchHit,
} from '../providers/vacancy-source-provider.interface';
import type { JobicyJob } from './jobicy.types';

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

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapJobicySearchHit(job: JobicyJob): VacancySearchHit {
  const industryTags = job.jobIndustry ?? [];
  return {
    externalId: String(job.id),
    url: job.url,
    title: job.jobTitle,
    publishedAt: job.pubDate ?? new Date().toISOString(),
    description: stripHtml(job.jobDescription) ?? stripHtml(job.jobExcerpt),
    keySkills: industryTags.map((tag) => tag.replace(/&amp;/g, '&')),
    employerName: job.companyName ?? null,
    raw: job,
  };
}

export function mapJobicyDetails(
  job: JobicyJob,
  meta: {
    requestUrl: string;
    requestParams: Record<string, unknown>;
    httpStatus: number;
  },
): VacancyDetails {
  const hit = mapJobicySearchHit(job);
  return {
    externalId: hit.externalId,
    url: hit.url,
    title: hit.title,
    description: hit.description ?? null,
    keySkills: hit.keySkills ?? [],
    employerName: hit.employerName ?? null,
    areaId: null,
    areaName: job.jobGeo ?? null,
    publishedAt: hit.publishedAt,
    archived: false,
    employment: job.jobType?.[0] ?? null,
    experience: job.jobLevel ?? null,
    schedule: null,
    salaryFrom: toNumber(job.salaryMin),
    salaryTo: toNumber(job.salaryMax),
    salaryCurrency: job.salaryCurrency ?? null,
    salaryGross: null,
    requestUrl: meta.requestUrl,
    requestParams: meta.requestParams,
    httpStatus: meta.httpStatus,
    raw: job,
  };
}
