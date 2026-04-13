import { useState } from "react";
import { useEntries } from "../api/hooks";
import type { TimeEntry } from "../api/types";
import { todayDateString, formatDuration, entryDurationSeconds } from "../lib/time";
import TimerBar from "../components/TimerBar";
import ProjectPills from "../components/ProjectPills";
import EntryList from "../components/EntryList";
import EntryForm from "../components/EntryForm";

export default function Today() {
  const today = todayDateString();
  const { data: entries } = useEntries({ date: today });
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const totalSeconds = (entries ?? []).reduce(
    (sum, e) => sum + entryDurationSeconds(e.started_at, e.stopped_at),
    0,
  );

  return (
    <div className="p-4 space-y-4">
      <TimerBar />
      <ProjectPills />

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          Today — {formatDuration(totalSeconds)}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          + Add entry
        </button>
      </div>

      <EntryList entries={entries ?? []} onEdit={setEditing} />

      {editing && (
        <EntryForm entry={editing} onClose={() => setEditing(null)} />
      )}
      {showAdd && <EntryForm onClose={() => setShowAdd(false)} />}
    </div>
  );
}
