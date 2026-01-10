'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square, Maximize2, RefreshCw, Clock3, Timer as TimerIcon } from 'lucide-react';
import { useTimer } from '@/lib/TimerContext';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks';
import { supabase } from '@/lib/supabaseClient';
import { getDateInTimezone } from '@/lib/timezones';
import { cn } from '@/lib/utils';

type Mode = 'stopwatch' | 'countdown';

const formatTime = (totalSeconds: number): string => {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function FocusTimer() {
  const { isRunning, elapsedSeconds, startTimer, pauseTimer, stopTimer } = useTimer();
  const { user } = useAuth(false);
  const [mode, setMode] = useState<Mode>('stopwatch');
  const [externalStop, setExternalStop] = useState(false);
  const externalStopRef = useRef(false);

  // Countdown state
  const [cdMinutes, setCdMinutes] = useState(30);
  const [cdTarget, setCdTarget] = useState(cdMinutes * 60);
  const [cdRemaining, setCdRemaining] = useState(cdTarget);
  const [cdRunning, setCdRunning] = useState(false);
  const cdEndRef = useRef<number | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const countdownInputRef = useRef<HTMLInputElement | null>(null);
  const [editSegment, setEditSegment] = useState<'hours' | 'minutes' | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setCountdownActiveFlag = (active: boolean) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('countdownActive', active ? 'true' : 'false');
    }
  };
  const lastSavedRef = useRef<{ duration: number; at: number } | null>(null);

  // Load timezone
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('user_profiles')
        .select('timezone')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.timezone) setUserTimezone(data.timezone);
        });
    }
  }, [user?.id]);

  useEffect(() => {
    externalStopRef.current = externalStop;
  }, [externalStop]);

  // Fetch external stop flag
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_status')
      .select('external_stop')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (typeof data?.external_stop === 'boolean') {
          setExternalStop(data.external_stop);
        }
      });
  }, [user?.id]);

  const updateStatus = useCallback(async (isActive: boolean, currentSeconds: number) => {
    if (!user?.id) return;
    if (externalStopRef.current && isActive) return;
    try {
      await supabase.from('user_status').upsert({
        user_id: user.id,
        is_active: isActive,
        current_seconds: Math.max(0, Math.floor(currentSeconds)),
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });
    } catch (error) {
      console.error('[FocusTimer] Failed to update status:', error);
    }
  }, [user?.id]);

  const clearExternalStop = useCallback(async () => {
    if (!user?.id) return;
    setExternalStop(false);
    externalStopRef.current = false;
    try {
      const payload = {
        user_id: user.id,
        external_stop: false,
        last_updated: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('user_status')
        .update(payload)
        .eq('user_id', user.id)
        .select('user_id');
      if (error) {
        console.error('[FocusTimer] Failed to clear external stop:', error);
        return;
      }
      if (!data || data.length === 0) {
        const { error: insertError } = await supabase
          .from('user_status')
          .insert(payload);
        if (insertError) {
          console.error('[FocusTimer] Failed to insert user status:', insertError);
        }
      }
    } catch (error) {
      console.error('[FocusTimer] Failed to clear external stop:', error);
    }
  }, [user?.id]);

  const saveSession = useCallback(
    async (seconds: number) => {
      if (!user?.id || seconds <= 0) return;
      try {
        const nowMs = Date.now();
        if (
          lastSavedRef.current &&
          lastSavedRef.current.duration === Math.round(seconds) &&
          nowMs - lastSavedRef.current.at < 2000
        ) {
          return;
        }
        const now = new Date();
        const today = getDateInTimezone(now, userTimezone);
        const nowISO = now.toISOString();
        const sessionId = crypto.randomUUID();
        const timestamp = nowMs;

        await supabase.from('focus_sessions').insert({
          id: sessionId,
          user_id: user.id,
          duration: Math.round(seconds),
          date: today,
          timestamp,
          createdAt: nowISO,
          updatedAt: nowISO,
        });

        lastSavedRef.current = { duration: Math.round(seconds), at: nowMs };

        window.dispatchEvent(new CustomEvent('focusSessionAdded', {
          detail: { date: today, duration: Math.round(seconds), timestamp }
        }));
      } catch (error) {
        console.error('[FocusTimer] Failed to save session:', error);
      }
    },
    [user?.id, userTimezone],
  );

  // Countdown ticking
  useEffect(() => {
    if (!cdRunning || cdEndRef.current === null) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, (cdEndRef.current! - Date.now()) / 1000);
      setCdRemaining(remaining);
      if (remaining === 0) {
        setCdRunning(false);
        cdEndRef.current = null;
        void saveSession(cdTarget);
      }
    }, 250);
    return () => clearInterval(id);
  }, [cdRunning, cdTarget, saveSession]);

  const resetCountdown = (minutes?: number) => {
    const mins = minutes !== undefined ? minutes : cdMinutes;
    const target = mins * 60;
    setCdMinutes(mins);
    setCdTarget(target);
    setCdRemaining(target);
    setCdRunning(false);
    cdEndRef.current = null;
    setCountdownActiveFlag(false);
  };

  const stopCountdown = () => {
    setCdRunning(false);
    cdEndRef.current = null;
    const worked = Math.max(0, cdTarget - cdRemaining);
    if (worked > 0) {
      void saveSession(worked);
    }
    resetCountdown();
    setCountdownActiveFlag(false);
  };

  const applyCountdownInput = (val: string) => {
    if (!editSegment) return;
    const digits = val.replace(/\D/g, '');
    if (!digits) return;

    const baseHours = Math.floor(cdTarget / 3600);
    const baseMinutes = Math.floor(cdTarget / 60) % 60;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    let newHours = baseHours;
    let newMinutes = baseMinutes;

    if (editSegment === 'hours') {
      const limited = digits.slice(0, 4); // max HHMM
      const hrsStr = limited.slice(0, 2);
      const spill = limited.slice(2); // up to two digits for minutes
      const hrsVal = parseInt(hrsStr || '0', 10);
      if (!Number.isNaN(hrsVal)) newHours = clamp(hrsVal, 0, 99);

      if (spill.length === 1) {
        const minsVal = parseInt(spill, 10) * 10;
        if (!Number.isNaN(minsVal)) newMinutes = clamp(minsVal, 0, 59);
      } else if (spill.length === 2) {
        const minsVal = parseInt(spill, 10);
        if (!Number.isNaN(minsVal)) newMinutes = clamp(minsVal, 0, 59);
      }
    } else if (editSegment === 'minutes') {
      if (digits.length > 2) {
        const limited = digits.slice(0, 4); // max HHMM
        const over = limited.slice(0, -2);
        const mins = limited.slice(-2);
        const overHours = parseInt(over || '0', 10);
        const minsVal = parseInt(mins, 10);
        if (!Number.isNaN(overHours)) newHours = clamp(overHours, 0, 99);
        if (!Number.isNaN(minsVal)) newMinutes = clamp(minsVal, 0, 59);
      } else {
        const num = parseInt(digits, 10);
        if (!Number.isNaN(num)) {
          newMinutes = clamp(num, 0, 59);
        }
      }
    }

    const totalSeconds = newHours * 3600 + newMinutes * 60;

    setCdRunning(false);
    cdEndRef.current = null;
    setCdTarget(totalSeconds);
    setCdRemaining(totalSeconds);
    setCdMinutes(totalSeconds === 0 ? 0 : Math.max(1, Math.round(totalSeconds / 60)));
    setCountdownActiveFlag(false);
  };

  // Persist countdown to localStorage
  useEffect(() => {
    const state = {
      cdMinutes,
      cdTarget,
      cdRemaining,
      cdRunning,
      timestamp: Date.now(),
    };
    localStorage.setItem('clock_countdown_state', JSON.stringify(state));
  }, [cdMinutes, cdTarget, cdRemaining, cdRunning]);

  useEffect(() => {
    const saved = localStorage.getItem('clock_countdown_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const remaining = Math.max(0, parsed.cdRemaining);
        setCdMinutes(parsed.cdMinutes || 30);
        setCdTarget(parsed.cdTarget || parsed.cdMinutes * 60 || 1800);
        setCdRemaining(remaining || parsed.cdTarget || parsed.cdMinutes * 60 || 1800);
        setCdRunning(parsed.cdRunning && remaining > 0);
        if (parsed.cdRunning && remaining > 0) {
          cdEndRef.current = now + remaining * 1000;
        }
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Warn before unload when countdown running; stopwatch warning comes from TimerContext
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cdRunning) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cdRunning]);

  // Status updates for countdown (stopwatch handled by TimerContext)
  useEffect(() => {
    if (!user?.id) return;
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    if (mode === 'countdown' && cdRunning) {
      const worked = cdTarget - cdRemaining;
      updateStatus(true, worked);
      setCountdownActiveFlag(true);
      statusIntervalRef.current = setInterval(() => {
        const currentRemaining = Math.max(0, (cdEndRef.current ?? Date.now()) - Date.now()) / 1000;
        const currentWorked = cdTarget - currentRemaining;
        updateStatus(true, currentWorked);
      }, 5000);
    } else {
      setCountdownActiveFlag(false);
      if (!isRunning) {
        const worked = mode === 'countdown' ? cdTarget - cdRemaining : elapsedSeconds;
        updateStatus(false, worked);
      }
    }

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [mode, cdRunning, cdTarget, cdRemaining, updateStatus, isRunning, elapsedSeconds, user?.id]);

  // Subscribe to realtime changes on user_status (for Python focus tracker pauses) - for countdown mode
  useEffect(() => {
    if (!user?.id || mode !== 'countdown') return;

    const channel = supabase
      .channel('countdown_user_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_status',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newStatus = payload.new as {
            is_active: boolean;
            current_seconds: number;
            external_stop?: boolean;
          };

          if (newStatus.is_active === false && cdRunning) {
            console.log('[Timer] Countdown paused by focus tracker');
            setCdRunning(false);
            const remaining = Math.max(0, (cdEndRef.current ?? Date.now()) - Date.now()) / 1000;
            setCdRemaining(remaining);
            cdEndRef.current = null;
            setCountdownActiveFlag(false);
          }

          if (typeof newStatus.external_stop === 'boolean') {
            setExternalStop(newStatus.external_stop);
            if (newStatus.external_stop && cdRunning) {
              console.log('[Timer] Countdown paused by external stop');
              setCdRunning(false);
              const remaining = Math.max(0, (cdEndRef.current ?? Date.now()) - Date.now()) / 1000;
              setCdRemaining(remaining);
              cdEndRef.current = null;
              setCountdownActiveFlag(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, mode, cdRunning]);

  // Push heartbeat on visibility change for countdown (helps when tab is backgrounded)
  useEffect(() => {
    const handler = () => {
      if (mode === 'countdown' && cdRunning) {
        const currentRemaining = Math.max(0, (cdEndRef.current ?? Date.now()) - Date.now()) / 1000;
        const currentWorked = cdTarget - currentRemaining;
        updateStatus(true, currentWorked);
        setCountdownActiveFlag(true);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [mode, cdRunning, cdTarget, updateStatus]);

  const handleToggle = () => {
    console.log('[FocusTimer] Toggle clicked - isRunning:', isRunning);
    if (isRunning) {
      console.log('[FocusTimer] Calling pauseTimer');
      pauseTimer();
    } else {
      if (externalStopRef.current) {
        return;
      }
      startTimer();
    }
  };

  const activeDisplay = mode === 'stopwatch'
    ? formatTime(elapsedSeconds)
    : formatTime(cdRemaining);

  return (
    <Card className="bg-card text-foreground shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Focus Session</CardTitle>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant={mode === 'stopwatch' ? 'default' : 'outline'}
              onClick={() => {
                setMode('stopwatch');
                setCdRunning(false);
              }}
              aria-label="Stopwatch"
              className="h-9 w-9"
            >
              <Clock3 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={mode === 'countdown' ? 'default' : 'outline'}
              onClick={() => {
                setMode('countdown');
                pauseTimer();
              }}
              aria-label="Countdown"
              className="h-9 w-9"
            >
              <TimerIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-5xl font-mono font-bold text-center text-foreground">
          {mode === 'countdown' ? (
            <div className="inline-flex items-baseline gap-1">
              <button
                type="button"
                className={cn(
                  "px-1 rounded transition-colors",
                  editSegment === 'hours' ? "bg-secondary/60" : "hover:text-primary"
                )}
                onClick={() => {
                  setEditSegment('hours');
                  if (countdownInputRef.current) {
                    countdownInputRef.current.value = '';
                    countdownInputRef.current.focus();
                  }
                }}
              >
                {String(Math.floor(cdRemaining / 3600)).padStart(2, '0')}
              </button>
              <span>:</span>
              <button
                type="button"
                className={cn(
                  "px-1 rounded transition-colors",
                  editSegment === 'minutes' ? "bg-secondary/60" : "hover:text-primary"
                )}
                onClick={() => {
                  setEditSegment('minutes');
                  if (countdownInputRef.current) {
                    countdownInputRef.current.value = '';
                    countdownInputRef.current.focus();
                  }
                }}
              >
                {String(Math.floor((cdRemaining / 60) % 60)).padStart(2, '0')}
              </button>
              <span>:</span>
              <span className="px-1 rounded text-muted-foreground">
                {String(Math.floor(cdRemaining % 60)).padStart(2, '0')}
              </span>
            </div>
          ) : (
            activeDisplay
          )}
          <input
            ref={countdownInputRef}
            type="text"
            inputMode="numeric"
            className="absolute h-0 w-0 opacity-0"
            aria-label="Set countdown"
            onBlur={() => setEditSegment(null)}
            onChange={(e) => applyCountdownInput(e.target.value)}
          />
          {mode === 'countdown' && (
            <p className="mt-2 text-xs text-muted-foreground">
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {mode === 'stopwatch' ? (
            <>
              <Button
                onClick={handleToggle}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
                disabled={externalStop}
              >
                {isRunning ? 
                  <Pause className="text-foreground mr-2 h-5 w-5" />
                  :
                  <Play className="text-foreground mr-2 h-5 w-5" />
                }
              </Button>
              <Button
                onClick={stopTimer}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
              >
                <Square className="mr-2 h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  if (cdRunning) {
                    setCdRunning(false);
                    const remaining = Math.max(0, (cdEndRef.current ?? Date.now()) - Date.now()) / 1000;
                    setCdRemaining(remaining);
                    cdEndRef.current = null;
                    setCountdownActiveFlag(false);
                  } else {
                    void clearExternalStop();
                    if (externalStopRef.current) {
                      return;
                    }
                    setCdRunning(true);
                    const start = Date.now();
                    cdEndRef.current = start + cdRemaining * 1000;
                    if (cdRemaining <= 0) {
                      resetCountdown();
                      setCdRunning(true);
                      const freshEnd = Date.now() + cdRemaining * 1000;
                      cdEndRef.current = freshEnd;
                    }
                    setCountdownActiveFlag(true);
                  }
                }}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
              >
                {cdRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <Button
                onClick={stopCountdown}
                className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
                size="lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
              </Button>
            </>
          )}
        </div>
        <Button
          asChild
          variant="ghost"
          className="w-full mt-[-12] justify-center text-muted-foreground hover:text-foreground"
        >
          <Link href="/subjects?clock=1">
            <Maximize2 className="mr-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
