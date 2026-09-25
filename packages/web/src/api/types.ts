export interface Project {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  started_at: string;
  stopped_at: string | null;
  note: string;
  created_at: string;
  project_name: string;
  project_color: string;
}

export interface ReportRow {
  id: string;
  name: string;
  color: string;
  total_seconds: number;
}

export interface ReportRecipient {
  email: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  projects_created: number;
  warnings: string[];
}
