"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      setTasks(await apiGet("/tasks"));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h2>Backend Tasks</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" />
        <button
          onClick={async () => {
            try {
              await apiPost("/tasks", { title, priority: "MEDIUM" });
              setTitle("");
              await refresh();
            } catch (e: any) {
              setError(String(e?.message ?? e));
            }
          }}
        >
          Add
        </button>
      </div>

      {error && <pre>{error}</pre>}

      <ul>
        {tasks.map((t) => (
          <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={async () => {
                await apiPatch(`/tasks/${t.id}`, { done: !t.done });
                await refresh();
              }}
            />
            <span>
              {t.title} ({t.priority})
            </span>
            <button
              onClick={async () => {
                await apiDelete(`/tasks/${t.id}`);
                await refresh();
              }}
            >
              delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
