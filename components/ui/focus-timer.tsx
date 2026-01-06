'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square } from 'lucide-react';
import { useTimer } from '@/lib/TimerContext';

export function FocusTimer() {
  const { isRunning, elapsedSeconds, startTimer, pauseTimer, stopTimer } = useTimer();

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
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
            onClick={stopTimer}
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
