import { useState, useEffect } from "react";
import { useActiveTimer, useStopTimer } from "../api/hooks";
import { formatElapsed } from "../lib/time";

export default function TimerBar() {
  const { data: timer } = useActiveTimer();
  const stopTimer = useStopTimer();
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!timer?.started_at) return;
    const tick = () => setElapsed(formatElapsed(timer.started_at));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [timer?.started_at]);

  if (!timer) {
    return (
      <div className="rounded-lg bg-gray-800 px-4 py-3 text-gray-500 text-center">
        No timer running — tap a project to start
      </div>
    );
  }

  return (
    <div
      className="rounded-lg px-4 py-3 flex items-center justify-between"
      style={{ backgroundColor: timer.project_color + "22", borderLeft: `4px solid ${timer.project_color}` }}
    >
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wide">Tracking</div>
        <div className="font-semibold">{timer.project_name}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-2xl font-mono tabular-nums">{elapsed}</div>
        <button
          onClick={() => stopTimer.mutate()}
          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors"
          aria-label="Stop timer"
        >
          <div className="w-3.5 h-3.5 rounded-sm bg-white" />
        </button>
      </div>
    </div>
  );
}
