import { useState, useEffect } from "react";
import type { TimeEntry, Project } from "../api/types";
import {
  useProjects,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
} from "../api/hooks";

interface Props {
  entry?: TimeEntry | null;
  onClose: () => void;
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDatetime(local: string): string {
  return new Date(local).toISOString();
}

export default function EntryForm({ entry, onClose }: Props) {
  const { data: projects } = useProjects();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const [projectId, setProjectId] = useState(entry?.project_id ?? "");
  const [startedAt, setStartedAt] = useState(
    entry ? toLocalDatetime(entry.started_at) : "",
  );
  const [stoppedAt, setStoppedAt] = useState(
    entry?.stopped_at ? toLocalDatetime(entry.stopped_at) : "",
  );
  const [note, setNote] = useState(entry?.note ?? "");

  useEffect(() => {
    if (!projectId && projects?.length) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !startedAt || !stoppedAt) return;

    if (entry) {
      await updateEntry.mutateAsync({
        id: entry.id,
        project_id: projectId,
        started_at: fromLocalDatetime(startedAt),
        stopped_at: fromLocalDatetime(stoppedAt),
        note,
      });
    } else {
      await createEntry.mutateAsync({
        project_id: projectId,
        started_at: fromLocalDatetime(startedAt),
        stopped_at: fromLocalDatetime(stoppedAt),
        note,
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!entry || !confirm("Delete this entry?")) return;
    await deleteEntry.mutateAsync(entry.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {entry ? "Edit Entry" : "Add Entry"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm"
          >
            {projects?.map((p: Project) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Start</label>
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">End</label>
            <input
              type="datetime-local"
              value={stoppedAt}
              onChange={(e) => setStoppedAt(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note..."
            className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-lg py-2 text-sm font-medium transition-colors"
          >
            {entry ? "Save" : "Add Entry"}
          </button>
          {entry && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
