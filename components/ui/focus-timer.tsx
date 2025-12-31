'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square } from 'lucide-react';

interface FocusTimerProps {
  onSessionComplete: (duration: number) => void;
}

export function FocusTimer({ onSessionComplete }: FocusTimerProps) {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleStop = () => {
    if (elapsedSeconds > 0) {
      onSessionComplete(elapsedSeconds);
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionStartTime(null);
    setAccumulatedSeconds(0);
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
