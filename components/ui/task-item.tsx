'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Square, Edit, Trash2 } from 'lucide-react';
import { DateUtils } from '@/lib/dateUtils';
import type { Task, Priority } from '@/types';
import { cn } from '@/lib/utils';
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


interface TaskItemProps {
  task: Task;
  subjectId: string;
  subjectColor: string;
  onToggle: () => void | Promise<void>;
  onTogglePin: () => void | Promise<void>;
  onUpdate: (updates: Partial<Task>) => Promise<void> | void;
  onDelete: () => void | Promise<void>;
  compact?: boolean;
}

export function TaskItem({ task, subjectId, subjectColor, onToggle, onTogglePin, onUpdate, onDelete, compact = false }: TaskItemProps) {
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [editDate, setEditDate] = useState<string>(task.dueDate);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);


  const handleTitleUpdate = async () => {
    await onUpdate({ title: editTitle });
    setEditingTitle(false);
  }

  const handlePriorityUpdate = async () => {
    await onUpdate({ priority: editPriority })
  }

  const handleDateUpdate = async (nextDate?: string) => {
    const dateToSave = nextDate ?? editDate;
    if (nextDate !== undefined) setEditDate(nextDate);

    await onUpdate({ dueDate: dateToSave });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      onDelete();
    }
  };


  const [dateOpen, setDateOpen] = useState(false)

  const selectedDate = task.dueDate ? new Date(task.dueDate + "T00:00:00") : undefined

  const onPickDate = (d?: Date) => {
    if (!d) return

    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const iso = `${yyyy}-${mm}-${dd}`
    handleDateUpdate(iso)     
    setDateOpen(false)        
  }

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

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-3 p-2 rounded-md bg-secondary hover:opacity-80 transition-colors overflow-hidden",
          task.completed && "opacity-50"
        )}
      >
        {/* LEFT: checkbox + title*/}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="shrink-0 h-8 w-8 hover:bg-transparent"
          >
            {task.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
          </Button>

          {editingTitle ? (
            <Input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleTitleUpdate()
                }
              }}
              onBlur={() => handleTitleUpdate()}
              className="bg-input min-w-0 flex-1"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className={cn(
                "min-w-0 flex-1 text-sm text-foreground truncate text-left",
                task.completed && "line-through"
              )}
            >
              {task.title}
            </button>
          )}
        </div>

        {/* RIGHT: priority + date + delete */}
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={editPriority}
            onValueChange={(value) => {
              const nextPriority = value as Priority
              setEditPriority(nextPriority)
              onUpdate({ priority: nextPriority })
            }}
          >
            <SelectTrigger
              className={cn(
                "inline-flex w-auto items-center rounded-md border border-transparent shadow px-2.5 py-0.5 text-xs font-semibold shrink-0 transition-colors h-auto",
                "focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                priorityColors[editPriority],
                "[&_svg]:hidden",
                "pr-2" 
              )}
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  "inline-flex w-auto items-center rounded-md border border-transparent shadow px-2.5 py-0.5 text-xs font-semibold shrink-0 transition-colors h-auto",
                  "focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                  isOverdue
                    ? "bg-[hsl(var(--error-bg))] text-[hsl(var(--error-fg))]"
                    : "bg-secondary text-foreground"
                )}
                onClick={() => setDateOpen(true)}
              >
                {task.dueDate ? format(selectedDate!, "MMM d") : "No due date"}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-auto p-0 outline-none [&_*]:focus:outline-none [&_*]:focus-visible:ring-0 [&_*]:focus-visible:ring-offset-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onPickDate}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="shrink-0 h-8 w-8 hover:text-destructive hover:bg-transparent text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

    </>
  );
}
