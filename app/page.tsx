"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Calendar, BarChart, Users, Clock, CheckSquare, ArrowRight, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [dailyActivity, setDailyActivity] = useState<{ date: string; minutes: number }[]>([]);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        // Get count of active users (is_active = true)
        const { count: activeCount } = await supabase
          .from('user_status')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        setActiveUsers(activeCount || 0);

        // Get total focus time and sessions for histogram
        const { data: sessions } = await supabase
          .from('focus_sessions')
          .select('duration, timestamp');

        const total = (sessions || []).reduce((sum, session) => sum + (session.duration || 0), 0);
        setTotalMinutes(Math.round(total / 60));

        // Calculate daily activity distribution for last 90 days
        const dailyMap = new Map<string, number>();
        const today = new Date();

        // Initialize last 90 days
        for (let i = 89; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('en-CA');
          dailyMap.set(dateStr, 0);
        }

        // Aggregate sessions by date
        (sessions || []).forEach(session => {
          if (session.timestamp) {
            const date = new Date(session.timestamp);
            const dateStr = date.toLocaleDateString('en-CA');
            if (dailyMap.has(dateStr)) {
              dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + session.duration / 60);
            }
          }
        });

        // Convert to array
        const dailyArray = Array.from(dailyMap.entries()).map(([date, minutes]) => ({
          date,
          minutes
        }));
        setDailyActivity(dailyArray);
      } catch (error) {
        console.error('Failed to fetch global stats:', error);
      }
    };

    fetchGlobalStats();

    // Subscribe to user_status changes for real-time active user count
    const channel = supabase
      .channel('global_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_status' }, () => {
        fetchGlobalStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours.toLocaleString()}h`;
    return `${hours.toLocaleString()}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24 flex-1">
        

        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Start fresh.
            <br />
            On a clean <span className="font-bold">Slate</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your all-in-one study planner. Stay organized, track your progress, and lock in with friends.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Task Management</h3>
              </div>
              <p className="text-muted-foreground">
                Organize your tasks by subject with priorities and due dates. Stay on top of your workload.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Focus Timer</h3>
              </div>
              <p className="text-muted-foreground">
                Built-in Pomodoro timer to help you stay focused and track your study sessions.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Calendar View</h3>
              </div>
              <p className="text-muted-foreground">
                Visualize your tasks and deadlines in a clean calendar interface.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Analytics</h3>
              </div>
              <p className="text-muted-foreground">
                Track your focus time with detailed charts and insights into your study habits.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Study Parties</h3>
              </div>
              <p className="text-muted-foreground">
                Create study groups, compete with friends, and see who's putting in the most hours.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Todo lists</h3>
              </div>
              <p className="text-muted-foreground">
                Quick daily task list to keep track of immediate priorities and stay productive.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
      {/* Global Stats */}
      <div className="flex justify-center gap-8">
        <div className="flex items-center gap-3 px-6 py-3 rounded-lg">
          <Flame className="h-16 w-16 text-orange-500" />
          <div>
            <div className="text-6xl font-bold text-foreground">{activeUsers}</div>
            <div className="text-sm text-muted-foreground">currently productive users</div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 rounded-lg">
          <Clock className="h-16 w-16 text-primary mr-1" />
          <div className="flex flex-col gap-2 justify-center">
            <div className="text-6xl font-bold text-foreground">{formatTime(totalMinutes)}</div>
            <div className="text-sm text-muted-foreground">total time logged</div>
          </div>
        </div>
      </div>
      {/* Activity Histogram */}
      <div className="w-full overflow-hidden -mb-2">
        <div className="flex items-end justify-center gap-[2px] h-32 px-8 pt-4">
          {dailyActivity.map((day, index) => {
            const maxMinutes = Math.max(...dailyActivity.map(d => d.minutes), 1);
            const heightPercent = (day.minutes / maxMinutes) * 100;
            const date = new Date(day.date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <div
                key={index}
                className="flex-1 max-w-[8px] flex items-end justify-center group relative"
                style={{ height: '100%' }}
              >
                <div
                  className="w-full bg-primary/70 hover:bg-primary rounded-t-sm transition-all cursor-pointer"
                  style={{
                    height: day.minutes > 0 ? `${Math.max(heightPercent + 10, 12)}%` : '12%',
                    opacity: day.minutes > 0 ? 1 : 0.1
                  }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    {formattedDate}: {Math.floor(day.minutes/60)}h {Math.round(day.minutes%60)}m
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
