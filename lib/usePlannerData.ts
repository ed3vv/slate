import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { DateUtils } from "@/lib/dateUtils";
import type { Priority, Subject, Task } from "@/types";

type ApiPriority = "LOW" | "MEDIUM" | "HIGH";

type ApiTask = {
  id: string;
  subjectId: string;
  title: string;
  done: boolean;
  priority: ApiPriority;
  // Nest + Prisma serialize Date to ISO strings, but be lenient in case a Date slips through
  dueDate?: string | Date | null;
  pinned?: boolean | null;
};

type ApiSubject = {
  id: string;
  name: string;
  color?: string | null;
  expanded?: boolean | null;
  tasks?: ApiTask[];
};

const toClientPriority = (priority: ApiPriority): Priority => priority.toLowerCase() as Priority;
const toApiPriority = (priority: Priority): ApiPriority => priority.toUpperCase() as ApiPriority;

const toDateOnly = (value?: string | Date | null) => {
  if (!value) return DateUtils.today();
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
};

const toIsoDate = (value?: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : undefined);

const mapTaskFromApi = (task: ApiTask): Task => ({
  id: task.id,
  title: task.title,
  dueDate: toDateOnly(task.dueDate),
  completed: task.done,
  priority: toClientPriority(task.priority),
  pinned: Boolean(task.pinned),
});

const mapSubjectFromApi = (subject: ApiSubject): Subject => ({
  id: subject.id,
  name: subject.name,
  color: subject.color ?? "bg-[hsl(var(--subject-sky))]",
  expanded: subject.expanded ?? true,
  tasks: (subject.tasks ?? []).map(mapTaskFromApi),
});

export function usePlannerData(enabled: boolean = true, userKey?: string) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Small helper to optimistically update state, then roll back on failure.
  const runOptimistic = useCallback(
    async (
      optimisticUpdate: (prev: Subject[]) => Subject[],
      apiCall: () => Promise<any>,
      afterSuccess?: (current: Subject[], result: any) => Subject[],
    ) => {
      let prevSnapshot: Subject[] = [];
      setSubjects((prev) => {
        prevSnapshot = prev;
        return optimisticUpdate(prev);
      });

      try {
        const result = await apiCall();
        if (afterSuccess) {
          setSubjects((current) => afterSuccess(current, result));
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setSubjects(prevSnapshot);
        throw e;
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: ApiSubject[] = await apiGet("/subjects");
      setSubjects(data.map(mapSubjectFromApi));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear data when disabled or user changes away
  useEffect(() => {
    if (!enabled || !userKey) {
      setSubjects([]);
      setError(null);
      setLoading(false);
    }
  }, [enabled, userKey]);

  useEffect(() => {
    if (!enabled || !userKey) return;
    refresh();
  }, [enabled, userKey, refresh]);

  const addSubject = useCallback(async (name: string, color: string) => {
    setError(null);
    const tempId = `temp-${Date.now()}`;

    await runOptimistic(
      (prev) => [
        ...prev,
        {
          id: tempId,
          name,
          color,
          expanded: true,
          tasks: [],
        },
      ],
      async () => apiPost("/subjects", { name, color }),
      (current, created: ApiSubject) =>
        current.map((s) => (s.id === tempId ? mapSubjectFromApi({ ...created, tasks: created.tasks ?? [] }) : s)),
    );
  }, [runOptimistic]);

  const updateSubject = useCallback(async (subjectId: string, updates: Partial<Subject>) => {
    setError(null);
    await runOptimistic(
      (prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, ...updates } : s)),
      async () =>
        apiPatch(`/subjects/${subjectId}`, {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.color !== undefined ? { color: updates.color } : {}),
          ...(updates.expanded !== undefined ? { expanded: updates.expanded } : {}),
        }),
      (current, updated: ApiSubject) =>
        current.map((s) =>
          s.id === subjectId
            ? mapSubjectFromApi({
                ...updated,
                tasks: updated.tasks as ApiTask[] | undefined ?? s.tasks.map((t) => ({
                  id: t.id,
                  subjectId: s.id,
                  title: t.title,
                  done: t.completed,
                  priority: toApiPriority(t.priority),
                  dueDate: t.dueDate,
                  pinned: t.pinned,
                })),
              })
            : s,
        ),
    );
  }, [runOptimistic]);

  const deleteSubject = useCallback(async (subjectId: string) => {
    setError(null);
    await runOptimistic(
      (prev) => prev.filter((s) => s.id !== subjectId),
      () => apiDelete(`/subjects/${subjectId}`),
    );
  }, [runOptimistic]);

  const addTask = useCallback(async (subjectId: string, title: string, dueDate: string, priority: Priority) => {
    setError(null);
    const tempId = `temp-${Date.now()}`;

    await runOptimistic(
      (prev) =>
        prev.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                tasks: [
                  ...s.tasks,
                  {
                    id: tempId,
                    title,
                    dueDate,
                    completed: false,
                    priority,
                    pinned: false,
                  },
                ],
              }
            : s,
        ),
      async () =>
        apiPost("/tasks", {
          title,
          subjectId,
          priority: toApiPriority(priority),
          dueDate: toIsoDate(dueDate),
          pinned: false,
          done: false,
        }),
      (current, created: ApiTask) =>
        current.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === tempId ? mapTaskFromApi({ ...created, subjectId }) : t,
                ),
              }
            : s,
      ),
    );
  }, [runOptimistic]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setError(null);
    await runOptimistic(
      (prev) =>
        prev.map((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        })),
      async () =>
        apiPatch(`/tasks/${taskId}`, {
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.priority !== undefined ? { priority: toApiPriority(updates.priority) } : {}),
          ...(updates.completed !== undefined ? { done: updates.completed } : {}),
          ...(updates.dueDate !== undefined ? { dueDate: toIsoDate(updates.dueDate) } : {}),
          ...(updates.pinned !== undefined ? { pinned: updates.pinned } : {}),
        }),
      (current, updated: ApiTask) =>
        current.map((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? mapTaskFromApi({ ...updated, subjectId: s.id }) : t)),
        })),
    );
  }, [runOptimistic]);

  const deleteTask = useCallback(async (taskId: string) => {
    setError(null);
    await runOptimistic(
      (prev) =>
        prev.map((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) })),
      () => apiDelete(`/tasks/${taskId}`),
    );
  }, [runOptimistic]);

  return {
    subjects,
    loading,
    error,
    refresh,
    addSubject,
    updateSubject,
    deleteSubject,
    addTask,
    updateTask,
    deleteTask,
    enabled,
    userKey,
  };
}

export default usePlannerData;
