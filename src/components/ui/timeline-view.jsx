import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, ArrowUpDown, CheckSquare } from 'lucide-react';
import { TimelineTaskItem } from './timeline-task-item';

export function TimelineView({ 
  tasks, 
  sortBy, 
  setSortBy, 
  onToggleTask, 
  onTogglePin, 
  onUpdateTask, 
  onDeleteTask, 
  sortTasks 
}) {
  const incompleteTasks = sortTasks(tasks.filter(t => !t.completed));
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-4">
      <Card className="shadow-md bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">All Tasks by {sortBy === 'dueDate' ? 'Due Date' : 'Priority'}</h2>
            </div>
            <Button
              onClick={() => setSortBy(sortBy === 'dueDate' ? 'priority' : 'dueDate')}
              variant="outline"
              className="bg-secondary hover:bg-secondary/80"
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort by {sortBy === 'dueDate' ? 'Priority' : 'Due Date'}
            </Button>
          </div>
          
          {incompleteTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex justify-center mb-3">
                <CheckSquare className="h-12 w-12" />
              </div>
              <p>All caught up! No pending tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incompleteTasks.map(task => (
                <TimelineTaskItem
                  key={`${task.subjectId}-${task.id}`}
                  task={task}
                  onToggle={() => onToggleTask(task.subjectId, task.id)}
                  onTogglePin={() => onTogglePin(task.subjectId, task.id)}
                  onUpdate={(updates) => onUpdateTask(task.subjectId, task.id, updates)}
                  onDelete={() => onDeleteTask(task.subjectId, task.id)}
                />
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer hover:opacity-80 font-medium text-muted-foreground">
                Completed Tasks ({completedTasks.length})
              </summary>
              <div className="space-y-2 mt-3">
                {completedTasks.map(task => (
                  <TimelineTaskItem
                    key={`${task.subjectId}-${task.id}`}
                    task={task}
                    onToggle={() => onToggleTask(task.subjectId, task.id)}
                    onTogglePin={() => onTogglePin(task.subjectId, task.id)}
                    onUpdate={(updates) => onUpdateTask(task.subjectId, task.id, updates)}
                    onDelete={() => onDeleteTask(task.subjectId, task.id)}
                  />
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}