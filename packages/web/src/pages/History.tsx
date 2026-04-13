import { useState } from "react";
import { useEntries } from "../api/hooks";
import type { TimeEntry } from "../api/types";
import { formatDuration, entryDurationSeconds } from "../lib/time";
import EntryList from "../components/EntryList";
import EntryForm from "../components/EntryForm";

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function History() {
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const { data: entries } = useEntries({ date });
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  const totalSeconds = (entries ?? []).reduce(
    (sum, e) => sum + entryDurationSeconds(e.started_at, e.stopped_at),
    0,
  );

  // Per-project totals
  const byProject = new Map<string, { name: string; color: string; seconds: number }>();
  for (const e of entries ?? []) {
    const existing = byProject.get(e.project_id);
    const sec = entryDurationSeconds(e.started_at, e.stopped_at);
    if (existing) {
      existing.seconds += sec;
    } else {
      byProject.set(e.project_id, {
        name: e.project_name,
        color: e.project_color,
        seconds: sec,
      });
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate((d) => shiftDate(d, -1))}
          className="px-3 py-1 text-gray-400 hover:text-gray-200 text-lg"
        >
          ←
        </button>
        <div className="text-center">
          <div className="font-medium">{formatDateLabel(date)}</div>
          <div className="text-xs text-gray-500">{formatDuration(totalSeconds)}</div>
        </div>
        <button
          onClick={() => setDate((d) => shiftDate(d, 1))}
          className="px-3 py-1 text-gray-400 hover:text-gray-200 text-lg"
        >
          →
        </button>
      </div>

      {byProject.size > 0 && (
        <div className="space-y-1">
          {[...byProject.values()]
            .sort((a, b) => b.seconds - a.seconds)
            .map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 text-gray-300">{p.name}</span>
                <span className="text-gray-500 tabular-nums">
                  {formatDuration(p.seconds)}
                </span>
              </div>
            ))}
        </div>
      )}

      <EntryList entries={entries ?? []} onEdit={setEditing} />

      {editing && (
        <EntryForm entry={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
