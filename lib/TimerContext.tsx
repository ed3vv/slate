'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './hooks';
import { getDateInTimezone } from './timezones';

interface TimerContextType {
  isRunning: boolean;
  elapsedSeconds: number;
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [externalStop, setExternalStop] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const stopInFlightRef = useRef<boolean>(false);
  const lastSavedRef = useRef<{ duration: number; at: number } | null>(null);
  const externalPauseDetectedRef = useRef<boolean>(false);
  const externalStopRef = useRef<boolean>(false);
  const desiredRunningRef = useRef<boolean>(false);
  const lastKnownElapsedRef = useRef<number>(0);
  const getCurrentElapsed = () => {
    if (isRunning && sessionStartTime) {
      return accumulatedSeconds + Math.floor((Date.now() - sessionStartTime) / 1000);
    }
    return elapsedSeconds;
  };
  const pauseLocally = () => {
    const currentElapsed = Math.max(getCurrentElapsed(), lastKnownElapsedRef.current);
    setAccumulatedSeconds(currentElapsed);
    setElapsedSeconds(currentElapsed);
    setSessionStartTime(null);
    setIsRunning(false);
  };

  // Fetch user timezone
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('user_profiles')
        .select('timezone')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.timezone) {
            setUserTimezone(data.timezone);
          }
        });
    }
  }, [user?.id]);

  useEffect(() => {
    externalStopRef.current = externalStop;
  }, [externalStop]);

  useEffect(() => {
    lastKnownElapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!externalStop && desiredRunningRef.current && !isRunning) {
      setIsRunning(true);
    }
  }, [externalStop, isRunning]);

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

  // Update user status in database
  const updateStatus = async (isActive: boolean, currentSeconds: number) => {
    if (!user?.id) return;

    // Don't send any updates if external pause was detected and hasn't been acknowledged
    if (externalPauseDetectedRef.current) {
      return;
    }
    if (externalStopRef.current && isActive) {
      return;
    }

    console.log('[TimerContext] Updating status:', { isActive, currentSeconds });

    try {
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: user.id,
          is_active: isActive,
          current_seconds: currentSeconds,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[TimerContext] Failed to update status:', error.message);
      }
    } catch (error) {
      console.error('[TimerContext] Failed to update status:', error);
    }
  };

  const clearExternalStop = async () => {
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
        console.error('[TimerContext] Failed to clear external stop:', error);
        return;
      }
      if (!data || data.length === 0) {
        const { error: insertError } = await supabase
          .from('user_status')
          .insert(payload);
        if (insertError) {
          console.error('[TimerContext] Failed to insert user status:', insertError);
        }
      }
    } catch (error) {
      console.error('[TimerContext] Failed to clear external stop:', error);
    }
  };

  // Timer interval effect
  useEffect(() => {
    if (isRunning) {
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const currentSessionSeconds = Math.floor((now - sessionStartTime!) / 1000);
        setElapsedSeconds(accumulatedSeconds + currentSessionSeconds);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, sessionStartTime, accumulatedSeconds]);

  // Broadcast status every 5 seconds when running
  useEffect(() => {
    if (isRunning && user?.id) {
      externalPauseDetectedRef.current = false; // Reset flag when timer starts

      // Calculate current elapsed inside the effect to get fresh values
      const currentElapsed = sessionStartTime
        ? accumulatedSeconds + Math.floor((Date.now() - sessionStartTime) / 1000)
        : elapsedSeconds;

      updateStatus(true, currentElapsed);

      statusUpdateRef.current = setInterval(() => {
        const elapsed = sessionStartTime
          ? accumulatedSeconds + Math.floor((Date.now() - sessionStartTime) / 1000)
          : elapsedSeconds;
        updateStatus(true, elapsed);
      }, 5000);
    } else if (user?.id) {
      // Skip marking inactive if countdown is active elsewhere
      const countdownActive = typeof window !== 'undefined'
        ? sessionStorage.getItem('countdownActive') === 'true'
        : false;
      if (!countdownActive) {
        updateStatus(false, elapsedSeconds);
      }
    }

    return () => {
      if (statusUpdateRef.current) {
        clearInterval(statusUpdateRef.current);
      }
    };
  }, [isRunning, user?.id, sessionStartTime, accumulatedSeconds, elapsedSeconds]);

  // Subscribe to realtime changes on user_status (for Python focus tracker pauses)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
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

          if (newStatus.is_active === false && isRunning) {
            console.log('[Timer] Paused by focus tracker');
            externalPauseDetectedRef.current = true;

            // Clear the status update interval immediately
            if (statusUpdateRef.current) {
              clearInterval(statusUpdateRef.current);
              statusUpdateRef.current = null;
            }

            pauseLocally();
          }

          if (typeof newStatus.external_stop === 'boolean') {
            setExternalStop(newStatus.external_stop);
            if (newStatus.external_stop && isRunning) {
              console.log('[Timer] Paused by external stop');
              externalPauseDetectedRef.current = true;
              desiredRunningRef.current = true;

              if (statusUpdateRef.current) {
                clearInterval(statusUpdateRef.current);
                statusUpdateRef.current = null;
              }

              pauseLocally();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isRunning]);

  // Visibility change: push a heartbeat when tab hides/shows to reduce missed updates when throttled
  useEffect(() => {
    const handler = () => {
      if (isRunning && user?.id) {
        const elapsed = sessionStartTime
          ? accumulatedSeconds + Math.floor((Date.now() - sessionStartTime) / 1000)
          : elapsedSeconds;
        updateStatus(true, elapsed);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isRunning, user?.id, sessionStartTime, accumulatedSeconds, elapsedSeconds]);

  // Warn before closing window with active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning]);

  // Set inactive on unmount
  useEffect(() => {
    return () => {
      if (user?.id) {
        updateStatus(false, 0);
      }
    };
  }, [user?.id]);

  const startTimer = () => {
    if (!isRunning) {
      void clearExternalStop();
      if (externalStopRef.current) {
        desiredRunningRef.current = true;
        return;
      }
      desiredRunningRef.current = true;
      setIsRunning(true);
    }
  };

  const pauseTimer = async () => {
    console.log('[Timer] pauseTimer called - isRunning:', isRunning, 'user?.id:', user?.id);

    if (isRunning && user?.id) {
      desiredRunningRef.current = false;
      const currentElapsed = sessionStartTime
        ? accumulatedSeconds + Math.floor((Date.now() - sessionStartTime) / 1000)
        : elapsedSeconds;

      console.log('[Timer] Paused by user');

      // Clear interval immediately
      if (statusUpdateRef.current) {
        clearInterval(statusUpdateRef.current);
        statusUpdateRef.current = null;
      }

      // Update database first, bypassing externalPauseDetectedRef check
      try {
        const { error } = await supabase
          .from('user_status')
          .upsert({
            user_id: user.id,
            is_active: false,
            current_seconds: currentElapsed,
            last_updated: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('[TimerContext] Failed to update status:', error.message);
        } else {
          console.log('[TimerContext] Updating status:', { isActive: false, currentSeconds: currentElapsed });
        }
      } catch (error) {
        console.error('[TimerContext] Failed to update status:', error);
      }

      // Then update local state
      setAccumulatedSeconds(currentElapsed);
      setSessionStartTime(null);
      setIsRunning(false);
    }
  };

  const stopTimer = async () => {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    try {
      desiredRunningRef.current = false;
      const duration = getCurrentElapsed();
      if (duration > 0 && user?.id) {
        const nowMs = Date.now();
        if (
          lastSavedRef.current &&
          lastSavedRef.current.duration === duration &&
          nowMs - lastSavedRef.current.at < 2000
        ) {
          return;
        }
        // Save session to database using user's timezone
        try {
          const now = new Date();
          const today = getDateInTimezone(now, userTimezone);
          const nowISO = now.toISOString();
          const sessionId = crypto.randomUUID();
          const timestamp = nowMs;

          await supabase
            .from('focus_sessions')
            .insert({
              id: sessionId,
              user_id: user.id,
              duration,
              date: today,
              timestamp: timestamp,
              createdAt: nowISO,
              updatedAt: nowISO,
            });

          lastSavedRef.current = { duration, at: nowMs };

          // Dispatch event to notify analytics and other components
          window.dispatchEvent(new CustomEvent('focusSessionAdded', {
            detail: { date: today, duration, timestamp }
          }));
        } catch (error) {
          console.error('[Focus Timer] Failed to save session:', error);
        }
      }
    } finally {
      setIsRunning(false);
      setElapsedSeconds(0);
      setSessionStartTime(null);
      setAccumulatedSeconds(0);
      stopInFlightRef.current = false;
    }
  };

  return (
    <TimerContext.Provider value={{ isRunning, elapsedSeconds, startTimer, pauseTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
