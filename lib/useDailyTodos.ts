import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { DateUtils } from "./dateUtils";

export type DailyTodo = {
  id: string;
  title: string;
  done: boolean;
  date: string;
};

type DbDailyTodo = {
  id: string;
  title: string;
  done: boolean;
  date: string;
};

const mapTodoFromDb = (todo: DbDailyTodo): DailyTodo => ({
  id: todo.id,
  title: todo.title,
  done: todo.done,
  date: todo.date,
});

export function useDailyTodos(enabled: boolean = true, userKey?: string) {
  const [todos, setTodos] = useState<DailyTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userKey) return;
    setLoading(true);
    setError(null);
    try {
      const today = DateUtils.today();
      const { data, error: err } = await supabase
        .from("daily_todos")
        .select("id,title,done,date")
        .eq("date", today)
        .order("created_at", { ascending: true });

      if (err) {
        console.error('Daily todos query error:', err);
        throw err;
      }
      setTodos((data ?? []).map(mapTodoFromDb));
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      console.error('Daily todos error:', e);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    if (!enabled || !userKey) {
      setTodos([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, userKey, refresh]);

  const addTodo = useCallback(async (title: string) => {
    if (!userKey) return;
    const today = DateUtils.today();
    const newTodo: DailyTodo = {
      id: crypto.randomUUID(),
      title,
      done: false,
      date: today,
    };
    setTodos(prev => [...prev, newTodo]);

    try {
      const { error: err } = await supabase
        .from("daily_todos")
        .insert({
          id: newTodo.id,
          title,
          done: false,
          date: today,
          user_id: userKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      setTodos(prev => prev.filter(t => t.id !== newTodo.id));
    }
  }, [userKey]);

  const toggleTodo = useCallback(async (todoId: string) => {
    if (!userKey) return;
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, done: !t.done } : t));

    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo) return;

      const { error: err } = await supabase
        .from("daily_todos")
        .update({
          done: !todo.done,
          updated_at: new Date().toISOString(),
        })
        .eq("id", todoId);
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      refresh();
    }
  }, [userKey, todos, refresh]);

  const deleteTodo = useCallback(async (todoId: string) => {
    if (!userKey) return;
    setTodos(prev => prev.filter(t => t.id !== todoId));

    try {
      const { error: err } = await supabase
        .from("daily_todos")
        .delete()
        .eq("id", todoId);
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      refresh();
    }
  }, [userKey, refresh]);

  return { todos, loading, error, addTodo, toggleTodo, deleteTodo };
}
