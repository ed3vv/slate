'use client';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Trash2 } from 'lucide-react';
import { Chart } from 'chart.js/auto';
import type { FocusSession } from '@/types';

interface AnalyticsViewProps {
  focusSessions: FocusSession[];
  onDeleteSession: (timestamp: number) => void;
}

export function AnalyticsView({ focusSessions, onDeleteSession }: AnalyticsViewProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const days = timeframe === 'week' ? 7 : 30;
      const dateRange: string[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dateRange.push(date.toLocaleDateString('en-CA'));
      }

      const dailyTotals = dateRange.map(date => {
        const sessions = focusSessions.filter(s => s.date === date);
        return sessions.reduce((sum, s) => sum + s.duration, 0) / 60;
      });

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      const chartBgColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-bar-bg').trim();
      const chartBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-bar-border').trim();

      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dateRange.map(date => {
            const d = new Date(date + 'T12:00:00');
            return timeframe === 'week'
              ? d.toLocaleDateString('en-US', { weekday: 'short' })
              : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          datasets: [{
            label: 'Focus Time (minutes)',
            data: dailyTotals,
            backgroundColor: `hsl(${chartBgColor} / 0.5)`,
            borderColor: `hsl(${chartBorderColor})`,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return value + ' min';
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [focusSessions, timeframe]);

  const getTotalTime = (days: number): number => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toLocaleDateString('en-CA');

    return focusSessions
      .filter(s => s.date >= cutoffStr)
      .reduce((sum, s) => sum + s.duration, 0);
  };

  const getAveragePerDay = (days: number): number => {
    const total = getTotalTime(days);
    return total / days;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const todayTotal = getTotalTime(0);
  const weekTotal = getTotalTime(7);
  const monthTotal = getTotalTime(30);
  const weekAvg = getAveragePerDay(7);
  const monthAvg = getAveragePerDay(30);

  return (
    <div className="min-w-0 space-y-6">
      <Card className="shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Focus Session Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <Card className="bg-secondary border-none shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-1 text-muted-foreground">Today</div>
                <div className="text-2xl font-bold text-foreground">{formatDuration(todayTotal)}</div>
              </CardContent>
            </Card>
            <Card className="bg-secondary border-none shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-1 text-muted-foreground">This Week</div>
                <div className="text-2xl font-bold text-foreground">{formatDuration(weekTotal)}</div>
              </CardContent>
            </Card>
            <Card className="bg-secondary border-none shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-1 text-muted-foreground">This Month</div>
                <div className="text-2xl font-bold text-foreground">{formatDuration(monthTotal)}</div>
              </CardContent>
            </Card>
            <Card className="bg-secondary border-none shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-1 text-muted-foreground">Avg/Day (7d)</div>
                <div className="text-2xl font-bold text-foreground">{formatDuration(weekAvg)}</div>
              </CardContent>
            </Card>
            <Card className="bg-secondary border-none shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-1 text-muted-foreground">Avg/Day (30d)</div>
                <div className="text-2xl font-bold text-foreground">{formatDuration(monthAvg)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Focus Time Chart</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setTimeframe('week')}
                variant={timeframe === 'week' ? 'default' : 'outline'}
                className={timeframe === 'week' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
              >
                7 Days
              </Button>
              <Button
                onClick={() => setTimeframe('month')}
                variant={timeframe === 'month' ? 'default' : 'outline'}
                className={timeframe === 'month' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
              >
                30 Days
              </Button>
            </div>
          </div>

          <div className="rounded-md p-4 bg-secondary" style={{ height: '400px' }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {focusSessions.slice(-10).reverse().map((session) => (
              <div key={session.timestamp} className="group flex items-center justify-between p-3 rounded-md bg-secondary">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Clock className="flex-shrink-0 h-5 w-5 text-foreground" />
                  <span className="truncate text-foreground">{new Date(session.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold w-20 text-right text-foreground">{formatDuration(session.duration)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteSession(session.timestamp)}
                    className="text-destructive hover:text-destructive rounded transition-all hidden group-hover:inline-flex h-8 w-8"
                    title="delete session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {focusSessions.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">No focus sessions recorded yet. Start a session to track your study time!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
