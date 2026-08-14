/**
 * Extensible vacancy source contract.
 * HH and Remotive implement this; more providers can plug in later.
 */
export interface VacancySearchParams {
  text: string;
  host: string;
  page: number;
  perPage: number;
}

export interface VacancySearchHit {
  externalId: string;
  url: string;
  title: string;
  publishedAt: string;
  /** Present when the search payload already includes a usable description (e.g. Remotive). */
  description?: string | null;
  keySkills?: string[];
  employerName?: string | null;
  raw: unknown;
}

export interface VacancySearchResult {
  found: number;
  page: number;
  pages: number;
  items: VacancySearchHit[];
  requestUrl: string;
  requestParams: Record<string, unknown>;
  httpStatus: number;
  raw: unknown;
}

export interface VacancyDetails {
  externalId: string;
  url: string;
  title: string;
  description: string | null;
  keySkills: string[];
  employerName: string | null;
  areaId: string | null;
  areaName: string | null;
  publishedAt: string;
  archived: boolean;
  employment: string | null;
  experience: string | null;
  schedule: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  salaryCurrency: string | null;
  salaryGross: boolean | null;
  requestUrl: string;
  requestParams: Record<string, unknown>;
  httpStatus: number;
  raw: unknown;
}

export interface VacancySourceProvider {
  readonly code: string;
  search(params: VacancySearchParams): Promise<VacancySearchResult>;
  getVacancyDetails(externalId: string): Promise<VacancyDetails>;
}

export const VACANCY_SOURCE_PROVIDERS = Symbol('VACANCY_SOURCE_PROVIDERS');
