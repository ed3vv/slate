import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus } from 'lucide-react';
import { TaskItem } from './task-item';
import { Progress } from '@/components/ui/progress';

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
}) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [editingSubject, setEditingSubject] = useState(false);
  const [editSubjectName, setEditSubjectName] = useState(subject.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const availableColors = [
    'bg-[hsl(var(--subject-violet))]',
    'bg-[hsl(var(--subject-amber))]',
    'bg-[hsl(var(--subject-rose))]',
    'bg-[hsl(var(--subject-sky))]',
    'bg-green-500',
    'bg-blue-500'
  ];

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(subject.id, newTaskTitle, newTaskDate, newTaskPriority);
      setNewTaskTitle('');
      setNewTaskDate('');
      setNewTaskPriority('medium');
      setShowAddTask(false);
    }
  };

  const handleUpdateSubject = () => {
    if (editSubjectName.trim()) {
      onUpdateSubject(subject.id, { name: editSubjectName });
      setEditingSubject(false);
    }
  };

  const handleColorChange = (color) => {
    onUpdateSubject(subject.id, { color: color });
    setShowColorPicker(false);
  };

  const completedCount = subject.tasks.filter(t => t.completed).length;
  const totalCount = subject.tasks.length;
  const sortedTasks = sortTasks(subject.tasks);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card className="shadow-md bg-card overflow-hidden flex flex-col">
      <div
        className="p-4 cursor-pointer hover:opacity-80 transition-colors"
        onClick={() => onToggle(subject.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            {subject.expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            <div className="relative">
              <button
                className={`w-3 h-3 rounded-full ${subject.color} cursor-pointer hover:opacity-70 transition-all`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorPicker(!showColorPicker);
                }}
              />
              {showColorPicker && (
                <div className="absolute top-6 left-0 z-50 bg-card border border-border rounded-lg shadow-lg p-2 flex gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full ${color} cursor-pointer hover:opacity-70 transition-all`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColorChange(color);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {editingSubject ? (
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
              <h3 className="text-lg font-bold text-foreground">{subject.name}</h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setEditingSubject(true);
              }}
              className="h-8 w-8 hover:bg-secondary"
            >
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
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
        <div className="ml-9 mt-2">
          <Progress value={progress} className="h-1.5 bg-secondary" />
        </div>
      </div>

      {subject.expanded && (
        <CardContent className="px-4 pb-4 space-y-2 flex-1">
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
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
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