'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, Edit, Trash2 } from 'lucide-react';
import { DateUtils } from '@/lib/dateUtils';
import type { Task, Priority } from '@/types';

interface TaskItemProps {
  task: Task;
  subjectId: number;
  subjectColor: string;
  onToggle: () => void;
  onTogglePin: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  compact?: boolean;
}

export function TaskItem({ task, subjectId, subjectColor, onToggle, onTogglePin, onUpdate, onDelete, compact = false }: TaskItemProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [editDate, setEditDate] = useState<string>(task.dueDate);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);

  const handleUpdate = () => {
    onUpdate({ title: editTitle, dueDate: editDate, priority: editPriority });
    setEditing(false);
  };

  const isOverdue = task.dueDate < DateUtils.today() && !task.completed;

  const priorityColors: Record<Priority, string> = {
    high: 'bg-[hsl(var(--priority-high-bg))] text-[hsl(var(--priority-high-fg))] hover:bg-[hsl(var(--priority-high-bg))]',
    medium: 'bg-[hsl(var(--priority-medium-bg))] text-[hsl(var(--priority-medium-fg))] hover:bg-[hsl(var(--priority-medium-bg))]',
    low: 'bg-[hsl(var(--priority-low-bg))] text-[hsl(var(--priority-low-fg))] hover:bg-[hsl(var(--priority-low-bg))]'
  };

  const formatDate = (dateString: string): string => {
    const today = DateUtils.today();

    if (dateString === today) return 'Today';
    if (dateString < today) {
      return `${DateUtils.format(dateString)}`;
    }

    return DateUtils.format(dateString);
  };

  if (editing) {
    return (
      <div className="rounded-md p-3 space-y-2 bg-secondary">
        <Input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="bg-input"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="flex-1 bg-input"
          />
          <Select value={editPriority} onValueChange={(value) => setEditPriority(value as Priority)}>
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
            onClick={handleUpdate}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Save
          </Button>
          <Button
            onClick={() => setEditing(false)}
            variant="outline"
            size="sm"
            className="bg-secondary hover:bg-secondary/80"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md bg-secondary hover:opacity-80 transition-colors overflow-hidden ${task.completed ? 'opacity-50' : ''}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="shrink-0 h-8 w-8 hover:bg-transparent"
      >
        {task.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
      </Button>

      <span className={`min-w-0 flex-1 text-sm text-foreground truncate ${task.completed ? 'line-through' : ''}`}>
        {task.title}
      </span>

      <Badge variant="secondary" className={'shrink-0 ' + priorityColors[task.priority]}>
        {task.priority}
      </Badge>
      <Badge variant="secondary" className={isOverdue ? 'shrink-0 bg-[hsl(var(--error-bg))] text-[hsl(var(--error-fg))]' : 'shrink-0 bg-secondary text-foreground'}>
        {formatDate(task.dueDate)}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEditing(true)}
        className="shrink-0 h-8 w-8 hover:bg-transparent text-muted-foreground"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="shrink-0 h-8 w-8 hover:text-destructive hover:bg-transparent text-muted-foreground"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
