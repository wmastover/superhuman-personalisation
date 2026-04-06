export type RawRow = Record<string, string>;

export interface ColumnMap {
  personalisedLine: string;
  domain: string;
  name?: string;
  company?: string;
  linkedinUrl?: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'edited' | 'skipped' | 'invalid';

export interface ReviewRow {
  index: number;
  raw: RawRow;
  personalisedLine: string;
  originalPersonalisedLine: string;
  domain: string;
  name: string;
  company: string;
  linkedinUrl: string;
  status: ReviewStatus;
}

export type AppStep = 'upload' | 'mapping' | 'review' | 'export';

export const DEFAULT_TEMPLATE = `Hi {{name}},

{{personalised_line}}

I wanted to reach out because I think there's a real opportunity for us to work together.

Would you be open to a quick 20-minute call this week?

Best,
Will`;
