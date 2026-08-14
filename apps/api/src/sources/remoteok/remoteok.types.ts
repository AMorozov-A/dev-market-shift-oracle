export interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  url?: string;
  apply_url?: string;
  position?: string;
  company?: string;
  location?: string;
  date?: string;
  epoch?: number;
  description?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  legal?: string;
}

export type RemoteOkResponse = RemoteOkJob[];
