"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Pause, Play, RefreshCw, Timer } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { supabase } from "@/lib/supabaseClient";
import { getDateInTimezone } from "@/lib/timezones";
import { useTimer } from "@/lib/TimerContext";

type Mode = "stopwatch" | "countdown";
type FocusCategory = "productive" | "unproductive" | "session";
type FocusApp = { id: string; name: string; category: FocusCategory };
type SessionItem = { name: string; type: "app" | "website"; category: string; timestamp: string };

type FullscreenClockProps = {
  onClose?: () => void;
};

const formatSeconds = (totalSeconds: number) => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((clamped % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export function FullscreenClock({ onClose }: FullscreenClockProps) {
  console.log("[ClockPage] Component loaded");
  const router = useRouter();
  const { user } = useAuth(false);
  const { isRunning, elapsedSeconds, startTimer, pauseTimer, stopTimer } = useTimer();
  console.log("[ClockPage] isRunning:", isRunning, "user?.id:", user?.id);
  const [mode, setMode] = useState<Mode>("stopwatch");
  const [focusTrackingOn, setFocusTrackingOn] = useState(false);
  const [focusTab, setFocusTab] = useState<FocusCategory>("productive");
  const [appInput, setAppInput] = useState("");
  const [productiveApps, setProductiveApps] = useState<FocusApp[]>([]);
  const [unproductiveApps, setUnproductiveApps] = useState<FocusApp[]>([]);
  const [moveNotices, setMoveNotices] = useState<
    { id: string; message: string; visible: boolean }[]
  >([]);
  const [trackerRunning, setTrackerRunning] = useState(false);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);

  // Countdown state
  const [cdMinutes, setCdMinutes] = useState(30);
  const [cdTarget, setCdTarget] = useState(cdMinutes * 60);
  const [cdRemaining, setCdRemaining] = useState(cdTarget);
  const [cdRunning, setCdRunning] = useState(false);
  const [cdStart, setCdStart] = useState<number | null>(null);

  // User timezone
  const [userTimezone, setUserTimezone] = useState<string>("UTC");
  useEffect(() => {
    if (user?.id) {
      supabase
        .from("user_profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.timezone) setUserTimezone(data.timezone);
        });
    }
  }, [user?.id]);

  const saveSession = useCallback(
    async (seconds: number) => {
      if (!user?.id || seconds <= 0) return;
      try {
        const now = new Date();
        const today = getDateInTimezone(now, userTimezone);
        const nowISO = now.toISOString();
        const sessionId = crypto.randomUUID();
        const timestamp = Date.now();

        await supabase.from("focus_sessions").insert({
          id: sessionId,
          user_id: user.id,
          duration: Math.round(seconds),
          date: today,
          timestamp,
          createdAt: nowISO,
          updatedAt: nowISO,
        });

        window.dispatchEvent(
          new CustomEvent("focusSessionAdded", {
            detail: { date: today, duration: Math.round(seconds), timestamp },
          }),
        );
      } catch (error) {
        console.error("[Clock] Failed to save session:", error);
      }
    },
    [user?.id, userTimezone],
  );

  // Countdown ticking
  useEffect(() => {
    if (!cdRunning || cdStart === null) return;
    const id = setInterval(() => {
      const now = Date.now();
      setCdRemaining((prev) => {
        const delta = (now - cdStart) / 1000;
        const next = Math.max(0, prev - delta);
        if (next === 0) {
          setCdRunning(false);
          setCdStart(null);
          void saveSession(cdTarget);
        }
        return next;
      });
      setCdStart(now);
    }, 250);
    return () => clearInterval(id);
  }, [cdRunning, cdStart, cdTarget, saveSession]);

  const resetCountdown = (minutes?: number) => {
    const mins = minutes !== undefined ? minutes : cdMinutes;
    const target = mins * 60;
    setCdMinutes(mins);
    setCdTarget(target);
    setCdRemaining(target);
    setCdRunning(false);
    setCdStart(null);
  };

  const stopCountdown = () => {
    setCdRunning(false);
    setCdStart(null);
    const worked = Math.max(0, cdTarget - cdRemaining);
    if (worked > 0) {
      void saveSession(worked);
    }
    resetCountdown();
  };

  // Persist countdown to localStorage
  useEffect(() => {
    const state = {
      cdMinutes,
      cdTarget,
      cdRemaining,
      cdRunning,
      cdStart,
      timestamp: Date.now(),
    };
    localStorage.setItem("clock_countdown_state", JSON.stringify(state));
  }, [cdMinutes, cdTarget, cdRemaining, cdRunning, cdStart]);

  useEffect(() => {
    const saved = localStorage.getItem("clock_countdown_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const elapsed = parsed.cdRunning && parsed.cdStart ? (now - parsed.cdStart) / 1000 : 0;
        const remaining = Math.max(0, parsed.cdRemaining - elapsed);
        setCdMinutes(parsed.cdMinutes || 30);
        setCdTarget(parsed.cdTarget || parsed.cdMinutes * 60 || 1800);
        setCdRemaining(remaining || parsed.cdTarget || parsed.cdMinutes * 60 || 1800);
        setCdRunning(parsed.cdRunning && remaining > 0);
        setCdStart(parsed.cdRunning && remaining > 0 ? now : null);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Warn before unload when countdown running; stopwatch warning handled by TimerContext
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cdRunning) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cdRunning]);

  const activeDisplay =
    mode === "stopwatch" ? formatSeconds(elapsedSeconds) : formatSeconds(cdRemaining);

  const fetchFocusApps = useCallback(async () => {
    if (!user?.id) {
      setProductiveApps([]);
      setUnproductiveApps([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("focus_apps")
        .select("id,name,category")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const entries = data ?? [];
      setProductiveApps(entries.filter((app) => app.category === "productive"));
      setUnproductiveApps(entries.filter((app) => app.category === "unproductive"));
    } catch (error) {
      console.error("[Clock] Failed to load focus apps:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchFocusApps();
  }, [fetchFocusApps]);

  // Poll for focus apps updates when tracker is running
  useEffect(() => {
    if (!trackerRunning) return;

    const pollInterval = setInterval(() => {
      void fetchFocusApps();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [trackerRunning, fetchFocusApps]);

  // Check tracker status on mount
  useEffect(() => {
    const checkTrackerStatus = async () => {
      try {
        const response = await fetch("/api/focus-tracker");
        const data = await response.json();
        setTrackerRunning(data.isRunning);
      } catch (error) {
        console.error("[Clock] Failed to check tracker status:", error);
      }
    };
    void checkTrackerStatus();
  }, []);

  // Poll for session items when tracker is running
  useEffect(() => {
    if (!trackerRunning || !user?.id) return;

    const fetchSessionItems = async () => {
      try {
        const { data, error } = await supabase
          .from("user_status")
          .select("session_items")
          .eq("user_id", user.id)
          .single();

        if (!error && data?.session_items) {
          setSessionItems(data.session_items as SessionItem[]);
        }
      } catch (error) {
        console.error("[Clock] Failed to fetch session items:", error);
      }
    };

    void fetchSessionItems();
    const pollInterval = setInterval(fetchSessionItems, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [trackerRunning, user?.id]);

  const toggleTracker = async () => {
    if (!user?.id) return;

    setTrackerLoading(true);
    try {
      const action = trackerRunning ? "stop" : "start";
      const response = await fetch("/api/focus-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setTrackerRunning(!trackerRunning);
      } else {
        console.error("[Clock] Tracker toggle failed:", data.error);
        alert(`Failed to ${action} tracker: ${data.error}`);
      }
    } catch (error) {
      console.error("[Clock] Failed to toggle tracker:", error);
      alert("Failed to toggle tracker. Check console for details.");
    } finally {
      setTrackerLoading(false);
    }
  };

  const handleAddApp = () => {
    const trimmed = appInput.trim();
    if (!trimmed || !user?.id) return;
    const normalized = trimmed.toLowerCase();
    const targetList = focusTab === "productive" ? productiveApps : unproductiveApps;
    const otherList = focusTab === "productive" ? unproductiveApps : productiveApps;
    const targetSet = new Set(targetList.map((app) => app.name.toLowerCase()));
    const otherApp = otherList.find((app) => app.name.toLowerCase() === normalized);

    if (targetSet.has(normalized)) {
      setAppInput("");
      return;
    }

    if (otherApp) {
      const shouldMove = window.confirm(
        `"${otherApp.name}" already exists in the ${
          focusTab === "productive" ? "unproductive" : "productive"
        } list. Move it here?`,
      );
      if (!shouldMove) return;
      void (async () => {
        try {
          const { error } = await supabase
            .from("focus_apps")
            .update({ category: focusTab })
            .eq("id", otherApp.id);
          if (error) throw error;
          const nextOther = otherList.filter((item) => item.id !== otherApp.id);
          const nextTarget = [...targetList, { ...otherApp, category: focusTab }];
          if (focusTab === "productive") {
            setUnproductiveApps(nextOther);
            setProductiveApps(nextTarget);
          } else {
            setProductiveApps(nextOther);
            setUnproductiveApps(nextTarget);
          }
          setAppInput("");
        } catch (error) {
          console.error("[Clock] Failed to move focus app:", error);
          fetchFocusApps();
        }
      })();
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("focus_apps")
          .insert({
            user_id: user.id,
            category: focusTab,
            name: trimmed,
          })
          .select("id,name,category")
          .single();
        if (error) throw error;
        if (!data) return;
        if (focusTab === "productive") {
          setProductiveApps([...productiveApps, data]);
        } else {
          setUnproductiveApps([...unproductiveApps, data]);
        }
        setAppInput("");
      } catch (error) {
        console.error("[Clock] Failed to add focus app:", error);
      }
    })();
  };

  const addMoveNotice = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMoveNotices((prev) => [...prev, { id, message, visible: true }]);
    window.setTimeout(() => {
      setMoveNotices((prev) =>
        prev.map((notice) => (notice.id === id ? { ...notice, visible: false } : notice)),
      );
    }, 900);
    window.setTimeout(() => {
      setMoveNotices((prev) => prev.filter((notice) => notice.id !== id));
    }, 1300);
  };

  const handleMoveApp = (app: FocusApp) => {
    if (!user?.id) return;
    const targetCategory = focusTab === "productive" ? "unproductive" : "productive";
    const targetList = focusTab === "productive" ? unproductiveApps : productiveApps;
    const normalized = app.name.toLowerCase();
    const targetExists = targetList.some((item) => item.name.toLowerCase() === normalized);

    if (targetExists) {
      if (focusTab === "productive") {
        setProductiveApps(productiveApps.filter((item) => item.id !== app.id));
      } else {
        setUnproductiveApps(unproductiveApps.filter((item) => item.id !== app.id));
      }
      addMoveNotice(`Moved ${app.name} to ${targetCategory} list`);
      void (async () => {
        try {
          const { error } = await supabase.from("focus_apps").delete().eq("id", app.id);
          if (error) throw error;
        } catch (error) {
          console.error("[Clock] Failed to remove duplicate focus app:", error);
          fetchFocusApps();
        }
      })();
      return;
    }

    if (focusTab === "productive") {
      setProductiveApps(productiveApps.filter((item) => item.id !== app.id));
      setUnproductiveApps([...unproductiveApps, { ...app, category: "unproductive" }]);
    } else {
      setUnproductiveApps(unproductiveApps.filter((item) => item.id !== app.id));
      setProductiveApps([...productiveApps, { ...app, category: "productive" }]);
    }
    addMoveNotice(`Moved ${app.name} to ${targetCategory} list`);
    void (async () => {
      try {
        const { error } = await supabase
          .from("focus_apps")
          .update({ category: targetCategory })
          .eq("id", app.id);
        if (error) throw error;
      } catch (error) {
        console.error("[Clock] Failed to move focus app:", error);
        fetchFocusApps();
      }
    })();
  };

  const handleDeleteApp = (app: FocusApp) => {
    const shouldDelete = window.confirm(`Delete "${app.name}"?`);
    if (!shouldDelete) return;
    if (focusTab === "productive") {
      setProductiveApps(productiveApps.filter((item) => item.id !== app.id));
    } else {
      setUnproductiveApps(unproductiveApps.filter((item) => item.id !== app.id));
    }
    void (async () => {
      try {
        const { error } = await supabase.from("focus_apps").delete().eq("id", app.id);
        if (error) throw error;
      } catch (error) {
        console.error("[Clock] Failed to delete focus app:", error);
        fetchFocusApps();
      }
    })();
  };

  const clearExternalStop = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from("user_status")
        .upsert(
          {
            user_id: user.id,
            external_stop: false,
            last_updated: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
    } catch (error) {
      console.error("[Clock] Failed to clear external stop:", error);
    }
  }, [user?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            if (onClose) {
              onClose();
            } else {
              router.back();
            }
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant={mode === "stopwatch" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("stopwatch");
              setCdRunning(false);
            }}
          >
            Stopwatch
          </Button>
          <Button
            variant={mode === "countdown" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("countdown");
              pauseTimer();
            }}
          >
            Countdown
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Timer className="h-5 w-5" />
            <span className="text-sm capitalize">{mode}</span>
          </div>
          <div className="text-6xl md:text-7xl lg:text-8xl font-mono font-bold tracking-tight">
            {activeDisplay}
          </div>
          {mode === "countdown" && (
            <div className="text-muted-foreground">
              Target: {cdMinutes} min · Elapsed: {formatSeconds(cdTarget - cdRemaining)}
            </div>
          )}
        </div>

        {mode === "countdown" && (
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={240}
              value={cdMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isNaN(val) && val > 0) {
                  resetCountdown(val);
                }
              }}
              className="w-24 text-center"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        )}

        <div className="flex gap-3">
          {mode === "stopwatch" ? (
            <>
              <Button
                onClick={() => {
                  if (isRunning) {
                    console.log("[Clock] Pause button clicked");
                    pauseTimer();
                  } else {
                    startTimer();
                  }
                }}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Start
                  </>
                )}
              </Button>
              <Button
                onClick={stopTimer}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Save & Reset
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  if (cdRunning) {
                    setCdRunning(false);
                    setCdStart(null);
                  } else {
                    void clearExternalStop();
                    setCdRunning(true);
                    const start = Date.now();
                    setCdStart(start);
                    if (cdRemaining <= 0) {
                      resetCountdown();
                      setCdRunning(true);
                      setCdStart(Date.now());
                    }
                  }
                }}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
              >
                {cdRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Start
                  </>
                )}
              </Button>
              <Button
                onClick={stopCountdown}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Save & Reset
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <Button
          variant={focusTrackingOn ? "default" : "secondary"}
          size="sm"
          onClick={() => setFocusTrackingOn(true)}
        >
          Focus tracking
        </Button>
      </div>

      {focusTrackingOn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6"
          onClick={() => setFocusTrackingOn(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] rounded-lg border bg-background p-6 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-base font-medium">Focus tracking</div>
              <div className="flex items-center gap-3">
                {trackerRunning && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse" />
                    <span>Tracking active</span>
                  </div>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={trackerRunning ? "default" : "outline"}
                  onClick={toggleTracker}
                  disabled={trackerLoading}
                  className={trackerRunning ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {trackerLoading ? "..." : trackerRunning ? "Stop Tracker" : "Start Tracker"}
                </Button>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={focusTab === "productive" ? "default" : "secondary"}
                onClick={() => setFocusTab("productive")}
              >
                Productive
              </Button>
              <Button
                type="button"
                size="sm"
                variant={focusTab === "unproductive" ? "default" : "secondary"}
                onClick={() => setFocusTab("unproductive")}
              >
                Unproductive
              </Button>
              <Button
                type="button"
                size="sm"
                variant={focusTab === "session" ? "default" : "secondary"}
                onClick={() => setFocusTab("session")}
              >
                This Session
              </Button>
            </div>
            <div className="mt-5 flex min-h-0 flex-1 flex-col">
              {focusTab !== "session" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type an app name"
                    value={appInput}
                    onChange={(e) => setAppInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddApp();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddApp}>
                    Add
                  </Button>
                </div>
              )}
              <div className={`${focusTab !== "session" ? "mt-4" : ""} h-[40vh] overflow-auto rounded-md border p-4 text-sm text-muted-foreground sm:h-[50vh]`}>
                {focusTab === "session" ? (
                  sessionItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p>No activity yet.</p>
                      <p className="text-xs mt-2">Start your timer and switch between apps to see them here.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2 text-foreground">
                      {sessionItems.map((item, index) => (
                        <li
                          key={`${item.name}-${index}`}
                          className="flex items-center justify-between rounded border px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {item.category === "productive" ? "✓" : item.category === "unproductive" ? "✗" : "?"}
                            </span>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.type} • {item.timestamp}
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.category === "productive" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                            item.category === "unproductive" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}>
                            {item.category}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  (focusTab === "productive" ? productiveApps : unproductiveApps).length === 0 ? (
                    "No apps yet."
                  ) : (
                    <ul className="space-y-2 text-foreground">
                      {(focusTab === "productive" ? productiveApps : unproductiveApps).map(
                        (app) => (
                          <li
                            key={app.id}
                            className="group relative flex min-h-10 items-center rounded border px-3 py-2 pr-20"
                          >
                            <span>{app.name}</span>
                            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMoveApp(app)}
                                className="h-8 w-8 p-0 hover:bg-foreground/10"
                                aria-label={`Move ${app.name} to ${
                                  focusTab === "productive" ? "unproductive" : "productive"
                                }`}
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteApp(app)}
                                className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-600"
                                aria-label={`Delete ${app.name}`}
                              >
                                ×
                              </Button>
                            </div>
                          </li>
                        ),
                      )}
                    </ul>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {moveNotices.length > 0 && (
        <div className="fixed inset-x-0 bottom-10 z-50 flex flex-col items-center gap-2 px-4">
          {moveNotices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg transition-all duration-300 ${
                notice.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              {notice.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
