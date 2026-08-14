export interface JobicyJob {
  id: number | string;
  url: string;
  jobSlug?: string;
  jobTitle: string;
  companyName?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number | string;
  salaryMax?: number | string;
  salaryCurrency?: string;
}

export interface JobicyResponse {
  jobCount?: number;
  jobs?: JobicyJob[];
  statusCode?: number;
  success?: boolean;
}
