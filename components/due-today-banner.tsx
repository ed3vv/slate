'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { TaskWithSubject } from '@/types';

interface DueTodayBannerProps {
  tasks: TaskWithSubject[];
}

export function DueTodayBanner({ tasks }: DueTodayBannerProps) {
  if (tasks.length === 0) return null;

  return (
    <Card className="rounded-xl border-2 bg-secondary px-4 py-3 mb-6 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-foreground" />
          <h2 className="text-xl font-bold text-foreground">Due Today</h2>
        </div>
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="backdrop-blur rounded-md p-3 flex items-center gap-3 bg-muted/50 border">
              <span className={`w-3 h-3 rounded-full ${task.subjectColor}`}></span>
              <span className="font-medium flex-1 text-foreground">{task.title}</span>
              <span className="text-sm bg-muted px-2 py-1 rounded text-muted-foreground">{task.subjectName}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
