import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, Star, Edit, Trash2 } from 'lucide-react';
import { DateUtils } from '@/lib/dateUtils';

export function TaskItem({ task, subjectId, subjectColor, onToggle, onTogglePin, onUpdate, onDelete, compact = false }) {
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
    high: 'bg-[hsl(var(--priority-high-bg))] text-[hsl(var(--priority-high-fg))] hover:bg-[hsl(var(--priority-high-bg))]',
    medium: 'bg-[hsl(var(--priority-medium-bg))] text-[hsl(var(--priority-medium-fg))] hover:bg-[hsl(var(--priority-medium-bg))]',
    low: 'bg-[hsl(var(--priority-low-bg))] text-[hsl(var(--priority-low-fg))] hover:bg-[hsl(var(--priority-low-bg))]'
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
          <Select value={editPriority} onValueChange={setEditPriority}>
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
    <div className={`flex items-center gap-2 p-2 rounded-md bg-secondary hover:opacity-80 transition-colors ${task.completed ? 'opacity-50' : ''}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="h-8 w-8 hover:bg-transparent"
      >
        {task.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
      </Button>
      <span className={`flex-1 text-sm text-foreground ${task.completed ? 'line-through' : ''}`}>
        {task.title}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onTogglePin}
        className={`h-8 w-8 hover:bg-transparent ${task.pinned ? 'text-[hsl(var(--star))]' : 'text-muted-foreground hover:text-[hsl(var(--star))]'}`}
      >
        <Star className="h-4 w-4" fill={task.pinned ? 'currentColor' : 'none'} />
      </Button>
      <Badge variant="secondary" className={priorityColors[task.priority]}>
        {task.priority}
      </Badge>
      <Badge variant="secondary" className={isOverdue ? 'bg-[hsl(var(--error-bg))] text-[hsl(var(--error-fg))]' : 'bg-secondary text-foreground'}>
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