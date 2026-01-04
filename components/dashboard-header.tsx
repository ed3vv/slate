'use client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { List, Calendar, BarChart, Settings, Clock } from 'lucide-react';
import type { TaskStats } from '@/types';
import Link from "next/link";
import { usePathname } from "next/navigation";




interface DashboardHeaderProps {
  stats: TaskStats;
  overdueCount: number;
}

export function DashboardHeader({ stats, overdueCount }: DashboardHeaderProps) {
  const pathname = usePathname();

  const activeView =
    pathname.startsWith("/timeline") ? "timeline" :
    pathname.startsWith("/calendar") ? "calendar" :
    pathname.startsWith("/analytics") ? "analytics" :
    pathname.startsWith("/subjects") ? "subjects" :
    "";

  return (
    <Card className="mb-6 bg-card border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Study Planner</h1>
            <p className="mt-1 text-muted-foreground">Stay organized and lock in</p>
          </div>

          <div className="flex items-center gap-4">
            <Tabs value={activeView} suppressHydrationWarning>
              <TabsList className="bg-card border-2" suppressHydrationWarning>
                <TabsTrigger value="subjects" asChild className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Link href="/subjects">
                    <List className="mr-2 h-4 w-4" />
                    Subjects
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="timeline" asChild className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Link href="/timeline">
                    <Clock className="mr-2 h-4 w-4" />
                    Timeline
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="calendar" asChild className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Link href="/calendar">
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendar
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="analytics" asChild className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Link href="/analytics">
                    <BarChart className="mr-2 h-4 w-4" />
                    Analytics
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
