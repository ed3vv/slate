import { useCallback, useEffect, useState } from "react";
import { DateUtils } from "@/lib/dateUtils";
import type { Priority, Subject, Task } from "@/types";
import { supabase } from "./supabaseClient";

type DbTask = {
  id: string;
  subject_id: string;
  title: string;
  done: boolean;
  priority: string;
  due_date?: string | Date | null;
  pinned?: boolean | null;
};

type DbSubject = {
  id: string;
  name: string;
  color?: string | null;
  expanded?: boolean | null;
  tasks?: DbTask[];
};

const toClientPriority = (priority: string): Priority => (priority?.toLowerCase() as Priority) ?? "medium";
const toDbPriority = (priority: Priority): string => priority.toUpperCase();
const toDateOnly = (value?: string | Date | null) => {
  if (!value) return DateUtils.today();
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
};

const mapTaskFromDb = (task: DbTask): Task => ({
  id: task.id,
  title: task.title,
  dueDate: toDateOnly(task.due_date),
  completed: task.done,
  priority: toClientPriority(task.priority),
  pinned: Boolean(task.pinned),
});

const mapSubjectFromDb = (subject: DbSubject): Subject => ({
  id: subject.id,
  name: subject.name,
  color: subject.color ?? "bg-[hsl(var(--subject-sky))]",
  expanded: subject.expanded ?? true,
  tasks: (subject.tasks ?? []).map(mapTaskFromDb),
});

export function usePlannerData(enabled: boolean = true, userKey?: string) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const emitTaskChanged = () => {
    if (typeof window !== "undefined") {
      // Defer to avoid cross-render updates in other components
      setTimeout(() => window.dispatchEvent(new Event("taskChanged")), 0);
    }
  };

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
        const errorMessage = e?.message || e?.error_description || e?.details || JSON.stringify(e);
        setError(errorMessage);
        setSubjects(prevSnapshot);
        console.error('Operation error:', e);
        throw e;
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First get subjects - RLS will automatically filter by auth.uid()
      const { data: subjectsData, error: subjectsErr } = await supabase
        .from("subjects")
        .select("id,name,color,expanded")
        .order("createdAt", { ascending: true });

      if (subjectsErr) throw subjectsErr;

      // Then get tasks for those subjects
      const subjectIds = (subjectsData ?? []).map(s => s.id);
      let tasksData: DbTask[] = [];

      if (subjectIds.length > 0) {
        const { data: tasks, error: tasksErr } = await supabase
          .from("tasks")
          .select("id,title,priority,done,pinned,due_date,subject_id")
          .in("subject_id", subjectIds);

        if (tasksErr) {
          console.error('Tasks query error:', tasksErr);
          throw tasksErr;
        }
        tasksData = tasks ?? [];
      }

      // Combine subjects with their tasks
      const subjectsWithTasks = (subjectsData ?? []).map(subject => ({
        ...subject,
        tasks: tasksData.filter(task => task.subject_id === subject.id)
      }));

      setSubjects(subjectsWithTasks.map(mapSubjectFromDb));
    } catch (e: any) {
      const errorMessage = e?.message || e?.error_description || JSON.stringify(e);
      setError(errorMessage);
      console.error('Refresh error:', e);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  // Clear data when disabled or user changes away
  useEffect(() => {
    if (!enabled || !userKey) {
      setSubjects([]);
      setError(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, userKey, refresh]);

  const addSubject = useCallback(async (name: string, color: string) => {
    if (!userKey) {
      return;
    }
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
      async () => {
        const { data, error: err } = await supabase
          .from("subjects")
          .insert({
            id: crypto.randomUUID(),
            name,
            color,
            expanded: true,
            user_id: userKey,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select("id,name,color,expanded")
          .single();
        if (err) throw err;
        return data as DbSubject;
      },
      (current, created: DbSubject) =>
        current.map((s) => (s.id === tempId ? mapSubjectFromDb({ ...created, tasks: created.tasks ?? [] }) : s)),
    );
  }, [runOptimistic, userKey]);

  const updateSubject = useCallback(async (subjectId: string, updates: Partial<Subject>) => {
    if (!userKey) {
      return;
    }
    setError(null);
    await runOptimistic(
      (prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, ...updates } : s)),
      async () => {
        const { data, error: err } = await supabase
          .from("subjects")
          .update({
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.color !== undefined ? { color: updates.color } : {}),
            ...(updates.expanded !== undefined ? { expanded: updates.expanded } : {}),
            updatedAt: new Date().toISOString()
          })
          .eq("id", subjectId)
          .select("id,name,color,expanded")
          .single();
        if (err) throw err;
        return data as DbSubject;
      },
      (current, updated: DbSubject) =>
        current.map((s) =>
          s.id === subjectId
            ? mapSubjectFromDb({
                ...updated,
                tasks:
                  (updated.tasks as DbTask[] | undefined) ??
                  s.tasks.map((t) => ({
                    id: t.id,
                    subject_id: s.id,
                    title: t.title,
                    done: t.completed,
                    priority: t.priority,
                    due_date: t.dueDate,
                    pinned: t.pinned,
                  })),
              })
            : s,
        ),
    );
  }, [runOptimistic, userKey]);

  const deleteSubject = useCallback(async (subjectId: string) => {
    if (!userKey) {
      return;
    }
    setError(null);
    await runOptimistic(
      (prev) => prev.filter((s) => s.id !== subjectId),
      async () => {
        const { error: err } = await supabase.from("subjects").delete().eq("id", subjectId);
        if (err) throw err;
      },
    );
  }, [runOptimistic, userKey]);

  const addTask = useCallback(async (subjectId: string, title: string, dueDate: string, priority: Priority) => {
    if (!userKey) {
      return;
    }
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
      async () => {
        const { data, error: err } = await supabase
          .from("tasks")
          .insert({
            id: crypto.randomUUID(),
            title,
            subject_id: subjectId,
            user_id: userKey,
            priority: toDbPriority(priority),
            due_date: dueDate,
            pinned: false,
            done: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select("id,title,priority,done,pinned,due_date,subject_id")
          .single();
        if (err) {
          console.error('Task insert error:', err);
          throw err;
        }
        return data as DbTask;
      },
      (current, created: DbTask) =>
        {
          emitTaskChanged();
          return current.map((s) =>
            s.id === subjectId
              ? {
                  ...s,
                  tasks: s.tasks.map((t) =>
                    t.id === tempId ? mapTaskFromDb({ ...created, subject_id: subjectId }) : t,
                  ),
                }
              : s,
          );
        },
    );
  }, [runOptimistic, userKey]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!userKey) {
      return;
    }
    setError(null);
    await runOptimistic(
      (prev) =>
        prev.map((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        })),
      async () => {
        const { data, error: err } = await supabase
          .from("tasks")
          .update({
            ...(updates.title !== undefined ? { title: updates.title } : {}),
            ...(updates.priority !== undefined ? { priority: toDbPriority(updates.priority) } : {}),
            ...(updates.completed !== undefined ? { done: updates.completed } : {}),
            ...(updates.dueDate !== undefined ? { due_date: updates.dueDate } : {}),
            ...(updates.pinned !== undefined ? { pinned: updates.pinned } : {}),
            updatedAt: new Date().toISOString()
          })
          .eq("id", taskId)
          .select("id,title,priority,done,pinned,due_date,subject_id")
          .single();
        if (err) throw err;
        return data as DbTask;
      },
      (current, updated: DbTask) =>
        {
          const hasNonPriorityUpdates =
            updates.title !== undefined ||
            updates.completed !== undefined ||
            updates.dueDate !== undefined ||
            updates.pinned !== undefined;
          if (hasNonPriorityUpdates) {
            emitTaskChanged();
          }
          return current.map((s) => ({
            ...s,
            tasks: s.tasks.map((t) => (t.id === taskId ? mapTaskFromDb({ ...updated, subject_id: s.id }) : t)),
          }));
        },
    );
  }, [runOptimistic, userKey]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!userKey) {
      return;
    }
    setError(null);
    await runOptimistic(
      (prev) =>
        prev.map((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) })),
      async () => {
        const { error: err } = await supabase.from("tasks").delete().eq("id", taskId);
        if (err) throw err;
      },
      (current) => {
        emitTaskChanged();
        return current;
      },
    );
  }, [runOptimistic, userKey]);

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
