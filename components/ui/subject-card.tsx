'use client';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus } from 'lucide-react';
import { TaskItem } from './task-item';
import { Progress } from '@/components/ui/progress';
import type { Subject, Task, Priority } from '@/types';
import { cn } from '@/lib/utils';


interface SubjectCardProps {
  subject: Subject;
  onToggle: (subjectId: string) => Promise<void> | void;
  onToggleTask: (subjectId: string, taskId: string) => Promise<void> | void;
  onTogglePin: (subjectId: string, taskId: string) => Promise<void> | void;
  onAddTask: (subjectId: string, title: string, dueDate: string, priority: Priority) => Promise<void> | void;
  onUpdateTask: (subjectId: string, taskId: string, updates: Partial<Task>) => Promise<void> | void;
  onUpdateSubject: (subjectId: string, updates: Partial<Subject>) => Promise<void> | void;
  onDeleteTask: (subjectId: string, taskId: string) => Promise<void> | void;
  onDeleteSubject: (subjectId: string) => Promise<void> | void;
  sortTasks: (tasks: Task[]) => Task[];
}

export function SubjectCard({
  subject,
  onToggle,
  onToggleTask,
  onTogglePin,
  onAddTask,
  onUpdateTask,
  onUpdateSubject,
  onDeleteTask,
  onDeleteSubject,
  sortTasks
}: SubjectCardProps) {
  const [showAddTask, setShowAddTask] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDate, setNewTaskDate] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [editingSubject, setEditingSubject] = useState<boolean>(false);
  const [editSubjectName, setEditSubjectName] = useState<string>(subject.name);
  const colorFallbacks: Record<string, string> = {
    'bg-[hsl(var(--subject-violet))]': '#8b5cf6',
    'bg-[hsl(var(--subject-amber))]': '#f59e0b',
    'bg-[hsl(var(--subject-rose))]': '#ef4444',
    'bg-[hsl(var(--subject-sky))]': '#0ea5e9',
    'bg-[hsl(var(--subject-emerald))]': '#22c55e',
    'bg-[hsl(var(--subject-indigo))]': '#6366f1',
    'bg-[#22c55e]': '#22c55e',
    'bg-[#3b82f6]': '#3b82f6',
  };
  const resolveColor = (value: string) => {
    if (value?.startsWith('#') || value?.startsWith('rgb')) return value;
    return colorFallbacks[value] || '#3b82f6';
  };
  const [customColor, setCustomColor] = useState<string>(() => resolveColor(subject.color));
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const promise = onAddTask(subject.id, newTaskTitle, newTaskDate, newTaskPriority);
    // Close the UI immediately for snappier feel; still await to surface errors
    setNewTaskTitle('');
    setNewTaskDate('');
    setNewTaskPriority('medium');
    setShowAddTask(false);
    await promise;
  };

  const handleUpdateSubject = async () => {
    if (editSubjectName.trim()) {
      await onUpdateSubject(subject.id, { name: editSubjectName });
      setEditingSubject(false);
    }
  };

  const handleColorChange = async (color: string) => {
    await onUpdateSubject(subject.id, { color });
  };

  useEffect(() => {
    setCustomColor(resolveColor(subject.color));
  }, [subject.color]);

  const completedCount = subject.tasks.filter(t => t.completed).length;
  const totalCount = subject.tasks.length;
  const sortedTasks = sortTasks(subject.tasks);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const handleCardToggle = () => {
    if (editingSubject) return;
    onToggle(subject.id);
  };

  const isCustomColor = subject.color?.startsWith('#') || subject.color?.startsWith('rgb');
  const colorStyle = isCustomColor ? { backgroundColor: subject.color } : undefined;
  const colorClass = isCustomColor ? '' : subject.color;

  return (
    <Card className="shadow-md bg-card overflow-hidden flex flex-col">
      <div
        className="relative mb-6 p-4 cursor-pointer hover:opacity-80 transition-colors"
        onClick={handleCardToggle}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              onClick={handleCardToggle}
              className="cursor-pointer hover:opacity-70 transition-opacity"
              aria-label={subject.expanded ? "Collapse subject" : "Expand subject"}
            >
              {subject.expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
            <div className="relative">
              <div
                className={cn("w-3 h-3 rounded-full cursor-pointer hover:opacity-70 transition-all", colorClass)}
                style={colorStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  colorInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    colorInputRef.current?.click();
                  }
                }}
                aria-label="Change subject color"
              />
              <input
                ref={colorInputRef}
                type="color"
                value={customColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomColor(val);
                  handleColorChange(val);
                }}
                className="absolute left-0 top-0 h-6 w-6 opacity-0 cursor-pointer"
                aria-hidden
              />
            </div>
            {subject.expanded ? (
              editingSubject ? (
                <Input
                  type="text"
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  onBlur={handleUpdateSubject}
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateSubject()}
                  onClick={(e) => e.stopPropagation()}
                  className="text-lg font-bold border-b-2 focus-visible:ring-0 bg-transparent px-0"
                  autoFocus
                />
              ) : (
                <div
                  onClick={(e) => {
                    setEditingSubject(true);
                    e.stopPropagation();
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditingSubject(true);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <h3 className="text-lg font-bold text-foreground">
                    {subject.name}
                  </h3>
                </div>
              )
            ) : (
              <h3 className="text-lg font-bold text-foreground">
                {subject.name}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${subject.name}?`)) {
                  onDeleteSubject(subject.id);
                }
              }}
              className="h-8 w-8 hover:text-destructive hover:bg-secondary"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs ml-9 text-muted-foreground">
          {completedCount}/{totalCount} tasks
        </p>
        <div className="pointer-events-none absolute mt-11 left-1/2 top-1/2 w-[calc(100%-2.25rem)] -translate-x-1/2 -translate-y-1/2">
          <Progress value={progress} className="h-2 bg-secondary" />
        </div>
      </div>

      {subject.expanded && (
        <CardContent className="mt-[-12px] px-4 pb-4 space-y-2 flex-1">
          {sortedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              subjectId={subject.id}
              subjectColor={subject.color}
              onToggle={() => onToggleTask(subject.id, task.id)}
              onTogglePin={() => onTogglePin(subject.id, task.id)}
              onUpdate={(updates) => onUpdateTask(subject.id, task.id, updates)}
              onDelete={() => onDeleteTask(subject.id, task.id)}
            />
          ))}

          {showAddTask ? (
            <div className="rounded-md p-3 space-y-2 bg-secondary">
              <Input
                type="text"
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                className="bg-input"
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="flex-1 bg-input"
                />
                <Select value={newTaskPriority} onValueChange={(value) => setNewTaskPriority(value as Priority)}>
                  <SelectTrigger className="w-32 bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddTask}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Add
                </Button>
                <Button
                  onClick={() => { setShowAddTask(false); setNewTaskTitle(''); setNewTaskDate(''); }}
                  variant="outline"
                  size="sm"
                  className="bg-secondary hover:bg-secondary/80"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowAddTask(true)}
              variant="outline"
              className="bg-secondary/30 w-full border-dashed hover:bg-secondary/20 text-muted-foreground"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
