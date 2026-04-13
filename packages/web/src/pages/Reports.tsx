import { useState } from "react";
import { useReportSummary } from "../api/hooks";
import { formatDuration } from "../lib/time";

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function endOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function endOfMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split("T")[0];
}

type Period = "week" | "month" | "custom";

export default function Reports() {
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  let from: string, to: string;
  if (period === "week") {
    from = startOfWeek();
    to = endOfWeek();
  } else if (period === "month") {
    from = startOfMonth();
    to = endOfMonth();
  } else {
    from = customFrom;
    to = customTo;
  }

  const { data: rows } = useReportSummary(from, to);

  const totalSeconds = (rows ?? []).reduce((s, r) => s + r.total_seconds, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        {(["week", "month", "custom"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {p === "week" ? "This Week" : p === "month" ? "This Month" : "Custom"}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}

      {from && to && (
        <>
          <div className="text-xs text-gray-500">
            {from} to {to} — {formatDuration(totalSeconds)} total
          </div>

          {rows && rows.length > 0 ? (
            <div className="space-y-3">
              {rows.map((row) => {
                const pct = totalSeconds > 0 ? (row.total_seconds / totalSeconds) * 100 : 0;
                return (
                  <div key={row.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <span>{row.name}</span>
                      </div>
                      <span className="text-gray-400 tabular-nums">
                        {formatDuration(row.total_seconds)}
                        <span className="text-gray-600 ml-1">
                          ({Math.round(pct)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No tracked time in this period
            </p>
          )}
        </>
      )}
    </div>
  );
}
