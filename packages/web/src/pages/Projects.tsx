import { useState } from "react";
import { useProjects, useCreateProject, useUpdateProject } from "../api/hooks";
import type { Project } from "../api/types";

const DEFAULT_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

export default function Projects() {
  const { data: projects } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createProject.mutateAsync({ name: name.trim(), color });
    setName("");
    setColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
  };

  const startEditing = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateProject.mutateAsync({
      id: editingId,
      name: editName.trim(),
      color: editColor,
    });
    setEditingId(null);
  };

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name..."
          className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Add
        </button>
      </form>

      <div className="space-y-1">
        {projects?.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50"
          >
            {editingId === p.id ? (
              <>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  className="flex-1 bg-gray-800 rounded px-2 py-1 text-sm"
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 text-sm">{p.name}</span>
                <button
                  onClick={() => startEditing(p)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    updateProject.mutate({ id: p.id, archived: true })
                  }
                  className="text-xs text-red-400/60 hover:text-red-400"
                >
                  Archive
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
