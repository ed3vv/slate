import { useCallback, useEffect, useState } from "react";
import { DateUtils } from "./dateUtils";
import { supabase } from "./supabaseClient";
import type { TaskStats } from "@/types";

type TaskRow = {
  done: boolean;
  due_date?: string | Date | null;
};

const toDateOnly = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
};

export function useTaskStats(enabled: boolean, userId?: string) {
  const [stats, setStats] = useState<TaskStats>({ completed: 0, total: 0, pending: 0 });
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setStats({ completed: 0, total: 0, pending: 0 });
      setOverdueCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("tasks")
      .select("done,due_date")
      .eq("user_id", userId);

    if (err) {
      setError(err.message || "Failed to load task stats");
      setLoading(false);
      return;
    }

    const tasks: TaskRow[] = data ?? [];
    const total = tasks.length;
    const completed = tasks.filter((t) => t.done).length;
    const pending = total - completed;
    const today = DateUtils.today();
    const overdue = tasks.filter((t) => {
      const dueDate = toDateOnly(t.due_date);
      return !t.done && !!dueDate && dueDate < today;
    }).length;

    setStats({ total, completed, pending });
    setOverdueCount(overdue);
    setLoading(false);
  }, [enabled, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => refresh();
    window.addEventListener("taskChanged", handler);
    return () => window.removeEventListener("taskChanged", handler);
  }, [refresh]);

  return { stats, overdueCount, loading, error, refresh };
}
