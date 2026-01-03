"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type Subject = { id: string; name: string; color?: string | null; tasks?: Task[] };
type Task = { id: string; title: string; done: boolean; priority: "LOW" | "MEDIUM" | "HIGH"; subjectId: string };

export default function DevPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    const data = await apiGet("/subjects");
    setSubjects(data);
    if (!selectedSubjectId && data[0]?.id) setSelectedSubjectId(data[0].id);
  }

  useEffect(() => {
    refresh().catch((e) => setError(String(e?.message ?? e)));
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h2>Dev: Subjects + Tasks</h2>
      {error && <pre style={{ whiteSpace: "pre-wrap" }}>ERROR:\n{error}</pre>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="New subject name" />
        <button
          onClick={async () => {
            try {
              await apiPost("/subjects", { name: subjectName, color: null });
              setSubjectName("");
              await refresh();
            } catch (e: any) {
              setError(String(e?.message ?? e));
            }
          }}
        >
          Create subject
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
          <option value="">-- pick subject --</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="New task title" />
        <button
          onClick={async () => {
            try {
              await apiPost("/tasks", { title: taskTitle, subjectId: selectedSubjectId, priority: "MEDIUM" });
              setTaskTitle("");
              await refresh();
            } catch (e: any) {
              setError(String(e?.message ?? e));
            }
          }}
          disabled={!selectedSubjectId}
        >
          Create task
        </button>
      </div>

      <hr />

      {subjects.map((s) => (
        <div key={s.id} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <strong>{s.name}</strong>
            <button
              onClick={async () => {
                await apiDelete(`/subjects/${s.id}`);
                await refresh();
              }}
            >
              delete subject
            </button>
          </div>

          <ul>
            {(s.tasks ?? []).map((t: any) => (
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
      ))}
    </div>
  );
}
