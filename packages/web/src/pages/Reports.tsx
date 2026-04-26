import { useState } from "react";
import { useReportSummary } from "../api/hooks";
import { formatDuration } from "../lib/time";

function startOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function endOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function startOfMonth(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function endOfMonth(date: Date): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split("T")[0];
}

type Period = "week" | "month" | "custom";

export default function Reports() {
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date());

  function navigate(direction: -1 | 1) {
    setReferenceDate((prev) => {
      const next = new Date(prev);
      if (period === "week") next.setDate(next.getDate() + direction * 7);
      if (period === "month") {
        next.setDate(1);
        next.setMonth(next.getMonth() + direction);
      }
      return next;
    });
  }

  let from: string, to: string;
  if (period === "week") {
    from = startOfWeek(referenceDate);
    to = endOfWeek(referenceDate);
  } else if (period === "month") {
    from = startOfMonth(referenceDate);
    to = endOfMonth(referenceDate);
  } else {
    from = customFrom;
    to = customTo;
  }

  const { data: rows } = useReportSummary(from, to);

  const totalSeconds = (rows ?? []).reduce((s, r) => s + r.total_seconds, 0);

  const today = new Date();
  const forwardDisabled =
    period === "custom" ||
    (period === "week" && startOfWeek(referenceDate) >= startOfWeek(today)) ||
    (period === "month" && startOfMonth(referenceDate) >= startOfMonth(today));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          disabled={period === "custom"}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-800 ${
            period === "custom"
              ? "text-gray-600 cursor-not-allowed opacity-50"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          ‹
        </button>
        {(["week", "month", "custom"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => {
              if (p === "week" || p === "month") setReferenceDate(new Date());
              setPeriod(p);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {p === "week" ? "This Week" : p === "month" ? "This Month" : "Custom"}
          </button>
        ))}
        <button
          onClick={() => navigate(1)}
          disabled={forwardDisabled}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-800 ${
            forwardDisabled
              ? "text-gray-600 cursor-not-allowed opacity-50"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          ›
        </button>
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
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {from} to {to} — {formatDuration(totalSeconds)} total
            </div>
            <a
              href={`/api/export/csv?from=${from}&to=${to}`}
              download
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </a>
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
