'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, Edit, Trash2 } from 'lucide-react';
import { DateUtils } from '@/lib/dateUtils';

export function TimelineTaskItem({ task, onToggle, onTogglePin, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDate, setEditDate] = useState(task.dueDate);
  const [editPriority, setEditPriority] = useState(task.priority);

  const handleUpdate = () => {
    onUpdate({ title: editTitle, dueDate: editDate, priority: editPriority });
    setEditing(false);
  };

  const isOverdue = task.dueDate < DateUtils.today() && !task.completed;

  const priorityColors = {
    high: 'bg-[hsl(var(--priority-high-bg))] text-[hsl(var(--priority-high-fg))] border-[hsl(var(--priority-high-border))] hover:bg-[hsl(var(--priority-high-bg))]',
    medium: 'bg-[hsl(var(--priority-medium-bg))] text-[hsl(var(--priority-medium-fg))] border-[hsl(var(--priority-medium-border))] hover:bg-[hsl(var(--priority-medium-bg))]',
    low: 'bg-[hsl(var(--priority-low-bg))] text-[hsl(var(--priority-low-fg))] border-[hsl(var(--priority-low-border))] hover:bg-[hsl(var(--priority-low-bg))]'
  };

  const formatDate = (dateString) => {
    const today = DateUtils.today();
    
    if (dateString === today) return 'Today';
    if (dateString < today) {
      return `${DateUtils.format(dateString)} (Overdue)`;
    }
    
    return DateUtils.format(dateString);
  };

  if (editing) {
    return (
      <div className="rounded-md p-4 space-y-3 border-2 bg-secondary">
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
          <Select value={editPriority} onValueChange={setEditPriority}>
            <SelectTrigger className="w-40 bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleUpdate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Save
          </Button>
          <Button
            onClick={() => setEditing(false)}
            variant="outline"
            className="bg-secondary hover:bg-secondary/80"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-4 rounded-md border-2 transition-all ${
      task.completed ? 'opacity-60 bg-secondary' :
      isOverdue ? 'bg-[hsl(var(--error-bg))] border-[hsl(var(--error-border))]' :
      'bg-card'
    }`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="h-8 w-8 hover:bg-transparent"
      >
        {task.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
      </Button>
      <div className="flex-1">
        <div className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-block w-3 h-3 rounded-full ${task.subjectColor}`}></span>
          <span className="text-sm text-muted-foreground">{task.subjectName}</span>
        </div>
      </div>
      <Badge variant="outline" className={priorityColors[task.priority]}>
        {task.priority}
      </Badge>
      <Badge className={isOverdue ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}>
        {formatDate(task.dueDate)}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEditing(true)}
        className="h-8 w-8 hover:bg-transparent text-muted-foreground"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-8 w-8 hover:text-destructive hover:bg-transparent text-muted-foreground"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
