import type { TimeEntry } from "../api/types";
import { formatDuration, formatTime, entryDurationSeconds } from "../lib/time";

interface Props {
  entries: TimeEntry[];
  onEdit?: (entry: TimeEntry) => void;
}

export default function EntryList({ entries, onEdit }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">No entries yet</p>
    );
  }

  return (
    <div className="border-l-2 border-gray-800 ml-2 space-y-1">
      {entries.map((entry) => {
        const seconds = entryDurationSeconds(entry.started_at, entry.stopped_at);
        const isRunning = !entry.stopped_at;
        return (
          <button
            key={entry.id}
            onClick={() => onEdit?.(entry)}
            className="w-full text-left pl-4 pr-2 py-2 hover:bg-gray-800/50 rounded-r-lg transition-colors block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.project_color }}
                />
                <span className="font-medium text-sm">{entry.project_name}</span>
              </div>
              <span className={`text-sm tabular-nums ${isRunning ? "text-green-400" : "text-gray-400"}`}>
                {formatDuration(seconds)}{isRunning ? " (running)" : ""}
              </span>
            </div>
            <div className="text-xs text-gray-500 ml-4 mt-0.5">
              {formatTime(entry.started_at)} — {isRunning ? "now" : formatTime(entry.stopped_at!)}
              {entry.note && <span className="ml-2 text-gray-600">· {entry.note}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
