import { useCallback, useEffect, useState } from "react";
import type { Event } from "@/types";
import { supabase } from "./supabaseClient";

type DbEvent = {
  id: string;
  title: string;
  date: string;
  color: string;
};

const mapEventFromDb = (event: DbEvent): Event => ({
  id: parseInt(event.id, 10),
  title: event.title,
  date: event.date,
  color: event.color,
});

export function useEventsData(enabled: boolean = true, userKey?: string) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userKey) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("events")
        .select("id,title,date,color")
        .eq("user_id", userKey)
        .order("date", { ascending: true });

      if (err) throw err;
      setEvents((data ?? []).map(mapEventFromDb));
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      console.error('Events error:', e);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    if (!enabled || !userKey) {
      setEvents([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, userKey, refresh]);

  const addEvent = useCallback(async (title: string, date: string, color: string) => {
    if (!userKey) return;
    const newEvent: Event = { id: Date.now(), title, date, color };
    setEvents(prev => [...prev, newEvent]);

    try {
      const { error: err } = await supabase
        .from("events")
        .insert({
          id: newEvent.id.toString(),
          title,
          date,
          color,
          user_id: userKey,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      setEvents(prev => prev.filter(ev => ev.id !== newEvent.id));
    }
  }, [userKey]);

  const deleteEvent = useCallback(async (eventId: number) => {
    if (!userKey) return;
    setEvents(prev => prev.filter(e => e.id !== eventId));

    try {
      const { error: err } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId.toString())
        .eq("user_id", userKey);
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || JSON.stringify(e));
      refresh();
    }
  }, [userKey, refresh]);

  return { events, loading, error, addEvent, deleteEvent };
}
