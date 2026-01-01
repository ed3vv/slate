'use client';
import { useState, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ArrowUpDown } from 'lucide-react';
import { SubjectCard } from './subject-card';
import type { Subject, Task, SortBy, Priority } from '@/types';

interface SubjectsViewProps {
  subjects: Subject[];
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  onToggle: (subjectId: number) => void;
  onToggleTask: (subjectId: number, taskId: number) => void;
  onTogglePin: (subjectId: number, taskId: number) => void;
  onAddTask: (subjectId: number, title: string, dueDate: string, priority: Priority) => void;
  onUpdateTask: (subjectId: number, taskId: number, updates: Partial<Task>) => void;
  onUpdateSubject: (subjectId: number, updates: Partial<Subject>) => void;
  onAddSubject: (subject: Subject) => void;
  onDeleteTask: (subjectId: number, taskId: number) => void;
  onDeleteSubject: (subjectId: number) => void;
  sortTasks: (tasks: Task[]) => Task[];
}

export function SubjectsView({
  subjects,
  sortBy,
  setSortBy,
  onToggle,
  onToggleTask,
  onTogglePin,
  onAddTask,
  onAddSubject,
  onUpdateTask,
  onUpdateSubject,
  onDeleteTask,
  onDeleteSubject,
  sortTasks
}: SubjectsViewProps) {
  const [showAddSubject, setShowAddSubject] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [columns, setColumns] = useState<number>(3);
  const gridRef = useRef<HTMLDivElement>(null);

  const addSubject = () => {
    if (newSubjectName.trim()) {
      const colors = [
        'bg-[hsl(var(--subject-violet))]',
        'bg-[hsl(var(--subject-amber))]',
        'bg-[hsl(var(--subject-rose))]',
        'bg-[hsl(var(--subject-sky))]',
        'bg-[hsl(var(--subject-emerald))]',
        'bg-[hsl(var(--subject-indigo))]'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      onAddSubject({
        id: Date.now(),
        name: newSubjectName,
        color: randomColor,
        expanded: false,
        tasks: []
      });

      setNewSubjectName('');
      setShowAddSubject(false);
    }
  };

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const GAP = 16;
    const MIN_CARD_WIDTH = 420;

    const calculateColumns = () => {
      const availableWidth = grid.clientWidth;

      let newColumns = 1;
      for (let col = 1; col <= 10; col++) {
        const totalGapWidth = GAP * (col - 1);
        const spacePerColumn = (availableWidth - totalGapWidth) / col;

        if (spacePerColumn >= MIN_CARD_WIDTH) {
          newColumns = col;
        } else {
          break;
        }
      }

      if (newColumns !== columns) {
        setColumns(newColumns);
      }
    };

    calculateColumns();

    const resizeObserver = new ResizeObserver(calculateColumns);
    resizeObserver.observe(grid);

    return () => {
      resizeObserver.disconnect();
    };
  }, [columns]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-foreground">Your Subjects</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button
            onClick={() => setSortBy(sortBy === 'dueDate' ? 'priority' : 'dueDate')}
            variant="outline"
            size="sm"
            className="bg-accent text-foreground border-border hover:bg-accent/80"
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {sortBy === 'dueDate' ? 'Due Date' : 'Priority'}
          </Button>
        </div>
      </div>

      <div
        ref={gridRef}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {subjects.map(subject => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onToggle={onToggle}
            onToggleTask={onToggleTask}
            onTogglePin={onTogglePin}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onUpdateSubject={onUpdateSubject}
            onDeleteTask={onDeleteTask}
            onDeleteSubject={onDeleteSubject}
            sortTasks={sortTasks}
          />
        ))}

        {showAddSubject ? (
          <Card className="bg-card border border-border shadow-sm">
            <CardContent className="p-6">
              <Input
                type="text"
                placeholder="Subject name..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                className="bg-background mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  onClick={addSubject}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="sm"
                >
                  Add
                </Button>
                <Button
                  onClick={() => { setShowAddSubject(false); setNewSubjectName(''); }}
                  variant="outline"
                  className="bg-secondary hover:bg-secondary/80 border-border text-foreground"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setShowAddSubject(true)}
            variant="outline"
            className="border border-dashed border-border bg-secondary/60 hover:bg-secondary min-h-[200px] flex flex-col items-center justify-center text-muted-foreground"
          >
            <Plus className="h-6 w-6 mb-2" />
            <span>Add Subject</span>
          </Button>
        )}
      </div>
    </div>
  );
}
