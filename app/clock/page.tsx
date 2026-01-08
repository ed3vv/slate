"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pause, Play, RefreshCw, Timer } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { supabase } from "@/lib/supabaseClient";
import { getDateInTimezone } from "@/lib/timezones";
import { useTimer } from "@/lib/TimerContext";

type Mode = "stopwatch" | "countdown";

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

export default function ClockPage() {
  const router = useRouter();
  const { user } = useAuth(false);
  const { isRunning, elapsedSeconds, startTimer, pauseTimer, stopTimer } = useTimer();
  const [mode, setMode] = useState<Mode>("stopwatch");

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

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
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
    </div>
  );
}
