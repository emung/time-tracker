import { useProjects, useActiveTimer, useStartTimer } from "../api/hooks";

export default function ProjectPills() {
  const { data: projects } = useProjects();
  const { data: timer } = useActiveTimer();
  const startTimer = useStartTimer();

  if (!projects?.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
      {projects.map((p) => {
        const isActive = timer?.project_id === p.id;
        return (
          <button
            key={p.id}
            onClick={() => startTimer.mutate({ project_id: p.id })}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all"
            style={{
              backgroundColor: isActive ? p.color + "33" : "rgb(31 41 55)",
              border: `2px solid ${isActive ? p.color : "rgb(55 65 81)"}`,
              color: isActive ? p.color : "rgb(156 163 175)",
            }}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
