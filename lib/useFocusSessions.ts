import { useCallback, useEffect, useState } from "react";
import type { FocusSession } from "@/types";
import { supabase } from "./supabaseClient";

type DbFocusSession = {
  id: string;
  date: string;
  duration: number;
  timestamp: number;
};

const mapSessionFromDb = (session: DbFocusSession): FocusSession => ({
  date: session.date,
  duration: session.duration,
  timestamp: session.timestamp,
});

export function useFocusSessions(enabled: boolean = true, userKey?: string) {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userKey) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("focus_sessions")
        .select("id,date,duration,timestamp")
        .eq("user_id", userKey)
        .order("timestamp", { ascending: false });

      if (err) throw err;
      setSessions((data ?? []).map(mapSessionFromDb));
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      console.error('Focus sessions error:', e);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    if (!enabled || !userKey) {
      setSessions([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, userKey, refresh]);

  const addSession = useCallback(async (date: string, duration: number) => {
    if (!userKey) return;
    const timestamp = Date.now();
    const newSession: FocusSession = { date, duration, timestamp };
    setSessions(prev => [newSession, ...prev]);

    try {
      const { error: err } = await supabase
        .from("focus_sessions")
        .insert({
          id: crypto.randomUUID(),
          date,
          duration,
          timestamp,
          user_id: userKey,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      setSessions(prev => prev.filter(s => s.timestamp !== timestamp));
    }
  }, [userKey]);

  const deleteSession = useCallback(async (sessionTimestamp: number) => {
    if (!userKey) return;
    setSessions(prev => prev.filter(s => s.timestamp !== sessionTimestamp));

    try {
      const { error: err } = await supabase
        .from("focus_sessions")
        .delete()
        .eq("timestamp", sessionTimestamp)
        .eq("user_id", userKey);
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      refresh();
    }
  }, [userKey, refresh]);

  return { sessions, loading, error, addSession, deleteSession };
}
