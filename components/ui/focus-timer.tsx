'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks';

interface FocusTimerProps {
  onSessionComplete: (duration: number) => void;
}

export function FocusTimer({ onSessionComplete }: FocusTimerProps) {
  const { user } = useAuth(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const sessionSaveRef = useRef<NodeJS.Timeout | null>(null);

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

  // Save or update session in database
  const saveOrUpdateSession = async () => {
    if (!user?.id || elapsedSeconds === 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      if (currentSessionId) {
        // Update existing session
        console.log('[Focus Timer] Updating session:', currentSessionId, 'with duration:', elapsedSeconds);
        await supabase
          .from('focus_sessions')
          .update({
            duration: elapsedSeconds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentSessionId);
      } else {
        // Create new session
        console.log('[Focus Timer] Creating new session with duration:', elapsedSeconds);
        const { data, error } = await supabase
          .from('focus_sessions')
          .insert({
            user_id: user.id,
            duration: elapsedSeconds,
            date: today,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create session:', error);
        } else if (data) {
          setCurrentSessionId(data.id);
          console.log('[Focus Timer] New session created with ID:', data.id);
        }
      }
    } catch (error) {
      console.error('Failed to save/update session:', error);
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
      // Update immediately when starting
      updateStatus(true, elapsedSeconds);

      // Then update every 5 seconds
      statusUpdateRef.current = setInterval(() => {
        updateStatus(true, elapsedSeconds);
      }, 5000);
    } else if (user?.id) {
      // Update to inactive when stopped
      updateStatus(false, elapsedSeconds);
    }

    return () => {
      if (statusUpdateRef.current) {
        clearInterval(statusUpdateRef.current);
      }
    };
  }, [isRunning, elapsedSeconds, user?.id]);

  // Set inactive on unmount
  useEffect(() => {
    return () => {
      if (user?.id) {
        updateStatus(false, 0);
      }
    };
  }, [user?.id]);

  // Save/update session every minute when running
  useEffect(() => {
    if (isRunning && user?.id) {
      // Save immediately when starting (after 5 seconds to avoid empty sessions)
      const initialTimeout = setTimeout(() => {
        saveOrUpdateSession();
      }, 5000);

      // Then save every 60 seconds
      sessionSaveRef.current = setInterval(() => {
        console.log('[Focus Timer] Minutely session save triggered at', new Date().toLocaleTimeString());
        saveOrUpdateSession();
      }, 60000);

      return () => {
        clearTimeout(initialTimeout);
        if (sessionSaveRef.current) {
          clearInterval(sessionSaveRef.current);
        }
      };
    }
  }, [isRunning, user?.id, elapsedSeconds, currentSessionId]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (isRunning) {
      setAccumulatedSeconds(elapsedSeconds);
      setSessionStartTime(null);
    }
    setIsRunning(!isRunning);
  };

  const handleStop = async () => {
    if (elapsedSeconds > 0) {
      // Do a final save before completing
      await saveOrUpdateSession();
      onSessionComplete(elapsedSeconds);
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionStartTime(null);
    setAccumulatedSeconds(0);
    setCurrentSessionId(null); // Clear session ID for next session
  };

  return (
    <Card className="bg-card text-foreground shadow-md">
      <CardHeader>
        <CardTitle className="text-center text-foreground">Focus Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-5xl font-mono font-bold text-center text-foreground">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleToggle}
            className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
            size="lg"
          >
            {isRunning ? <><Pause className="text-foreground mr-2 h-5 w-5" />Pause</> : <><Play className="text-foreground mr-2 h-5 w-5" />Start</>}
          </Button>
          <Button
            onClick={handleStop}
            className="flex-1 bg-secondary hover:bg-secondary/50 text-foreground"
            size="lg"
          >
            <Square className="mr-2 h-5 w-5" />
            End
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
