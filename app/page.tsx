'use client';
import { useState } from 'react';
import { useAuth, useLocalStorage, useDarkMode } from '@/lib/hooks';
import { DashboardHeader } from '@/components/dashboard-header';
import { DueTodayBanner } from '@/components/due-today-banner';
import { FocusTimer } from '@/components/ui/focus-timer';
import { DailyTodos } from '@/components/ui/daily-todos';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SubjectsView } from '@/components/ui/subjects-view';
import { TimelineView } from '@/components/ui/timeline-view';
import { CalendarView } from '@/components/ui/calendar-view';
import { AnalyticsView } from '@/components/ui/analytics-view';
import { DateUtils } from '@/lib/dateUtils';
import type { Subject, TaskWithSubject, Event, FocusSession, SortBy, Priority, Task } from '@/types';


export default function Home() {
  const { loading } = useAuth();
  const [isDark, setIsDark] = useDarkMode();
  const [activeView, setActiveView] = useState('subjects');
  const [sortBy, setSortBy] = useState<SortBy>('dueDate');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);

  const [subjects, setSubjects] = useLocalStorage<Subject[]>('studentPlannerData', [
    { id: 1, name: 'Subject 1', color: 'bg-blue-500', expanded: true, tasks: [] },
    { id: 2, name: 'Subject 2', color: 'bg-green-500', expanded: true, tasks: [] },
  ]);

  const [events, setEvents] = useLocalStorage<Event[]>('studentPlannerEvents', []);
  const [focusSessions, setFocusSessions] = useLocalStorage<FocusSession[]>('focusSessions', []);

  const toggleSubject = (subjectId: number) => {
    setSubjects(subjects.map(s => s.id === subjectId ? { ...s, expanded: !s.expanded } : s));
  };

  const toggleTaskComplete = (subjectId: number, taskId: number) => {
    setSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    } : s));
  };

  const toggleTaskPin = (subjectId: number, taskId: number) => {
    setSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, pinned: !t.pinned } : t)
    } : s));
  };

  const addTask = (subjectId: number, taskTitle: string, dueDate: string, priority: Priority) => {
    if (!taskTitle.trim()) return;
    setSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      tasks: [...s.tasks, {
        id: Date.now(),
        title: taskTitle,
        dueDate: dueDate || DateUtils.today(),
        completed: false,
        priority: priority || 'medium',
        pinned: false
      }]
    } : s));
  };

  const updateTask = (subjectId: number, taskId: number, updates: Partial<Task>) => {
    setSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    } : s));
  };

  const updateSubject = (subjectId: number | 'add', updates: Subject) => {
    if (subjectId === 'add') {
      setSubjects([...subjects, updates]);
    } else {
      setSubjects(subjects.map(s => s.id === subjectId ? { ...s, ...updates } : s));
    }
  };

  const deleteTask = (subjectId: number, taskId: number) => {
    setSubjects(subjects.map(s => s.id === subjectId ? {
      ...s,
      tasks: s.tasks.filter(t => t.id !== taskId)
    } : s));
  };

  const deleteSubject = (subjectId: number) => {
    setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const addEvent = (eventData: Omit<Event, 'id'>) => {
    setEvents([...events, { ...eventData, id: Date.now() }]);
  };

  const deleteEvent = (eventId: number) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const addFocusSession = (duration: number) => {
    setFocusSessions([...focusSessions, {
      date: DateUtils.today(),
      duration,
      timestamp: Date.now()
    }]);
  };

  const deleteFocusSession = (sessionTimestamp: number) => {
    setSessionToDelete(sessionTimestamp);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setFocusSessions(focusSessions.filter(s => s.timestamp !== sessionToDelete));
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  const sortTasks = (tasks: Task[]): Task[] => {
    if (sortBy === 'priority') {
      const order = { high: 1, medium: 2, low: 3 };
      return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const getAllTasks = (): TaskWithSubject[] => {
    return subjects.flatMap(s => s.tasks.map(t => ({
      ...t,
      subjectName: s.name,
      subjectColor: s.color,
      subjectId: s.id
    })));
  };

  const getTasksStats = () => {
    const all = getAllTasks();
    const completed = all.filter(t => t.completed).length;
    return { completed, total: all.length, pending: all.length - completed };
  };

  const getOverdueTasks = () => {
    const today = DateUtils.today();
    return getAllTasks().filter(t => t.dueDate < today && !t.completed);
  };

  const getTasksDueToday = () => {
    const today = DateUtils.today();
    return getAllTasks().filter(t => t.dueDate === today && !t.completed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  const stats = getTasksStats();

  return (
    <div className="mb-60 min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-8xl mx-auto">
        <DashboardHeader
          activeView={activeView}
          setActiveView={setActiveView}
          isDark={isDark}
          toggleDark={() => setIsDark(!isDark)}
          stats={stats}
          overdueCount={getOverdueTasks().length}
        />

        <div className="flex flex-col gap-6 custom:flex-row">
          <div className="w-full flex-shrink-0 custom:w-80">
            <FocusTimer onSessionComplete={addFocusSession} />
            <DailyTodos />
          </div>

          <div className="flex-1 min-w-0">
            <DueTodayBanner tasks={getTasksDueToday()} />

            {activeView === 'subjects' && (
              <SubjectsView
                subjects={subjects}
                sortBy={sortBy}
                setSortBy={setSortBy}
                onToggle={toggleSubject}
                onToggleTask={toggleTaskComplete}
                onTogglePin={toggleTaskPin}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onUpdateSubject={updateSubject}
                onDeleteTask={deleteTask}
                onDeleteSubject={deleteSubject}
                sortTasks={sortTasks}
              />
            )}

            {activeView === 'timeline' && (
              <TimelineView
                tasks={getAllTasks()}
                sortBy={sortBy}
                setSortBy={setSortBy}
                onToggleTask={toggleTaskComplete}
                onTogglePin={toggleTaskPin}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                sortTasks={sortTasks}
              />
            )}

            {activeView === 'calendar' && (
              <CalendarView
                tasks={getAllTasks()}
                events={events}
                onAddEvent={addEvent}
                onDeleteEvent={deleteEvent}
              />
            )}

            {activeView === 'analytics' && (
              <AnalyticsView
                focusSessions={focusSessions}
                onDeleteSession={deleteFocusSession}
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        show={showDeleteConfirm}
        title="Delete Session?"
        message="Are you sure you want to delete this focus session? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSessionToDelete(null);
        }}
      />
    </div>
  );
}
