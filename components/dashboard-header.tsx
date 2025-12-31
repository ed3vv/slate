'use client';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { List, Calendar, BarChart, Moon, Sun, Settings } from 'lucide-react';
import type { TaskStats } from '@/types';
import Link from "next/link";


interface DashboardHeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isDark: boolean;
  toggleDark: () => void;
  stats: TaskStats;
  overdueCount: number;
}

export function DashboardHeader({ activeView, setActiveView, isDark, toggleDark, stats, overdueCount }: DashboardHeaderProps) {
  return (
    <Card className="mb-6 bg-card border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Study Planner</h1>
            <p className="mt-1 text-muted-foreground">Stay organized and lock in</p>
          </div>

          <div className="flex items-center gap-4">
            <Tabs value={activeView} onValueChange={setActiveView}>
              <TabsList className="bg-card border-2">
                <TabsTrigger value="subjects" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <List className="mr-2 h-4 w-4" />
                  Subjects
                </TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="calendar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BarChart className="mr-2 h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleDark}
              aria-label="Toggle dark mode"
              className='bg-card text-foreground hover:bg-secondary hover:text-foreground'
            >
              {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
            </Button>

            <Button 
              asChild variant="outline" 
              size="icon" 
              aria-label="Settings"
              className='bg-card text-foreground hover:bg-secondary hover:text-foreground'
            >
              <Link href="/settings">
                <Settings className="h-5 w-5" aria-hidden="true" /> 
              </Link>
            </Button>

            
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card className="bg-[hsl(var(--yellow-muted))] border-0">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
              <div className="text-sm font-medium text-muted-foreground">Pending Tasks</div>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--positive))] border-0">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
              <div className="text-sm font-medium text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--negative))] border-0">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{overdueCount}</div>
              <div className="text-sm font-medium text-muted-foreground">Overdue</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
