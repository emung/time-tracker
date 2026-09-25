import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";
import type {
  Project,
  TimeEntry,
  ReportRow,
  ReportRecipient,
  ImportResult,
} from "./types";

// ── Projects ──

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<Project[]>("/api/projects"),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      apiPost<Project>("/api/projects", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<Pick<Project, "name" | "color" | "archived">>) =>
      apiPatch<Project>(`/api/projects/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// ── Timer ──

export function useActiveTimer() {
  return useQuery({
    queryKey: ["timer"],
    queryFn: () => apiGet<TimeEntry | null>("/api/timer"),
    refetchInterval: 1000,
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { project_id: string; note?: string }) =>
      apiPost<TimeEntry>("/api/timer/start", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timer"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<TimeEntry>("/api/timer/stop"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timer"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

// ── Entries ──

export function useEntries(params: Record<string, string>) {
  return useQuery({
    queryKey: ["entries", params],
    queryFn: () => apiGet<TimeEntry[]>("/api/entries", params),
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      project_id: string;
      started_at: string;
      stopped_at: string;
      note?: string;
    }) => apiPost<TimeEntry>("/api/entries", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries"] }),
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<
      Pick<TimeEntry, "project_id" | "started_at" | "stopped_at" | "note">
    >) => apiPatch<TimeEntry>(`/api/entries/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries"] }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries"] }),
  });
}

// ── Reports ──

export function useReportSummary(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", from, to],
    queryFn: () => apiGet<ReportRow[]>("/api/reports/summary", { from, to }),
    enabled: !!from && !!to,
  });
}

export function useSendWeeklyReport() {
  return useMutation({
    mutationFn: () => apiPost<{ sent: boolean; to: string }>("/api/reports/send-weekly"),
  });
}

// ── Import ──

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csv: string) => apiPost<ImportResult>("/api/import/csv", { csv }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["timer"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// ── Settings ──

export function useReportRecipient() {
  return useQuery({
    queryKey: ["settings", "reportRecipient"],
    queryFn: () => apiGet<ReportRecipient>("/api/settings/report-recipient"),
  });
}

export function useUpdateReportRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiPatch<ReportRecipient>("/api/settings/report-recipient", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "reportRecipient"] }),
  });
}
