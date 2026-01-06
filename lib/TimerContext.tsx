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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusUpdateRef = useRef<NodeJS.Timeout | null>(null);

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

  // Update user status in database
  const updateStatus = async (isActive: boolean, currentSeconds: number) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_status')
        .upsert({
          user_id: user.id,
          is_active: isActive,
          current_seconds: currentSeconds,
          last_updated: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to update status:', error);
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
      updateStatus(true, elapsedSeconds);

      statusUpdateRef.current = setInterval(() => {
        updateStatus(true, elapsedSeconds);
      }, 5000);
    } else if (user?.id) {
      updateStatus(false, elapsedSeconds);
    }

    return () => {
      if (statusUpdateRef.current) {
        clearInterval(statusUpdateRef.current);
      }
    };
  }, [isRunning, elapsedSeconds, user?.id]);

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
      setIsRunning(true);
    }
  };

  const pauseTimer = () => {
    if (isRunning) {
      setAccumulatedSeconds(elapsedSeconds);
      setSessionStartTime(null);
      setIsRunning(false);
    }
  };

  const stopTimer = async () => {
    if (elapsedSeconds > 0 && user?.id) {
      // Save session to database using user's timezone
      try {
        const now = new Date();
        const today = getDateInTimezone(now, userTimezone);
        const nowISO = now.toISOString();
        const sessionId = crypto.randomUUID();
        const timestamp = Date.now();

        await supabase
          .from('focus_sessions')
          .insert({
            id: sessionId,
            user_id: user.id,
            duration: elapsedSeconds,
            date: today,
            timestamp: timestamp,
            createdAt: nowISO,
            updatedAt: nowISO,
          });

        // Dispatch event to notify analytics and other components
        window.dispatchEvent(new CustomEvent('focusSessionAdded', {
          detail: { date: today, duration: elapsedSeconds, timestamp }
        }));
      } catch (error) {
        console.error('[Focus Timer] Failed to save session:', error);
      }
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionStartTime(null);
    setAccumulatedSeconds(0);
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
