import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { List, Calendar, BarChart, Clock, Moon, Sun } from 'lucide-react';
import { FocusTimer } from '@/components/ui/focus-timer';
import { DailyTodos } from '@/components/ui/daily-todos';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SubjectsView } from '@/components/ui/subjects-view';
import { TimelineView } from '@/components/ui/timeline-view';
import { CalendarView } from '@/components/ui/calendar-view';
import { AnalyticsView } from '@/components/ui/analytics-view';
import { DateUtils } from '@/lib/dateUtils';
import { Analytics } from '@vercel/analytics/react';



function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  const [activeView, setActiveView] = useState('subjects');
  const [sortBy, setSortBy] = useState('dueDate');
  
  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem('studentPlannerData');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, name: 'Subject 1', color: 'bg-blue-500', expanded: true, tasks: [] },
      { id: 2, name: 'Subject 2', color: 'bg-green-500', expanded: true, tasks: [] },
    ];
  });

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('studentPlannerEvents');
    return saved ? JSON.parse(saved) : [];
  });

  const [focusSessions, setFocusSessions] = useState(() => {
    const saved = localStorage.getItem('focusSessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  useEffect(() => {
    localStorage.setItem('studentPlannerData', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('studentPlannerEvents', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('focusSessions', JSON.stringify(focusSessions));
  }, [focusSessions]);

  const toggleSubject = (subjectId) => {
    setSubjects(subjects.map(subject => 
      subject.id === subjectId ? { ...subject, expanded: !subject.expanded } : subject
    ));
  };

  const toggleTaskComplete = (subjectId, taskId) => {
    setSubjects(subjects.map(subject => 
      subject.id === subjectId ? {
        ...subject,
        tasks: subject.tasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      } : subject
    ));
  };

  const toggleTaskPin = (subjectId, taskId) => {
    setSubjects(subjects.map(subject => 
      subject.id === subjectId ? {
        ...subject,
        tasks: subject.tasks.map(task => 
          task.id === taskId ? { ...task, pinned: !task.pinned } : task
        )
      } : subject
    ));
  };

  const addTask = (subjectId, taskTitle, dueDate, priority) => {
    if (taskTitle.trim()) {
      setSubjects(subjects.map(subject => 
        subject.id === subjectId ? {
          ...subject,
          tasks: [...subject.tasks, {
            id: Date.now(),
            title: taskTitle,
            dueDate: dueDate || DateUtils.today(),
            completed: false,
            priority: priority || 'medium',
            pinned: false
          }]
        } : subject
      ));
    }
  };

  const updateTask = (subjectId, taskId, updates) => {
    setSubjects(subjects.map(subject => 
      subject.id === subjectId ? {
        ...subject,
        tasks: subject.tasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      } : subject
    ));
  };

  const updateSubject = (subjectId, updates) => {
    if (subjectId === 'add') {
      setSubjects([...subjects, updates]);
    } else {
      setSubjects(subjects.map(subject => 
        subject.id === subjectId ? { ...subject, ...updates } : subject
      ));
    }
  };

  const deleteTask = (subjectId, taskId) => {
    setSubjects(subjects.map(subject => 
      subject.id === subjectId ? {
        ...subject,
        tasks: subject.tasks.filter(task => task.id !== taskId)
      } : subject
    ));
  };

  const deleteSubject = (subjectId) => {
    setSubjects(subjects.filter(subject => subject.id !== subjectId));
  };

  const addEvent = (eventData) => {
    setEvents([...events, { ...eventData, id: Date.now() }]);
  };

  const deleteEvent = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  const addFocusSession = (duration) => {
    const today = DateUtils.today();
    setFocusSessions([...focusSessions, {
      date: today,
      duration: duration,
      timestamp: Date.now()
    }]);
  };

  const deleteFocusSession = (sessionTimestamp) => {
    setSessionToDelete(sessionTimestamp);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setFocusSessions(focusSessions.filter(session => session.timestamp !== sessionToDelete));
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  const sortTasks = (tasks) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else {
      return [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }
  };

  const getAllTasks = () => {
    const allTasks = [];
    subjects.forEach(subject => {
      subject.tasks.forEach(task => {
        allTasks.push({ 
          ...task, 
          subjectName: subject.name, 
          subjectColor: subject.color, 
          subjectId: subject.id 
        });
      });
    });
    return allTasks;
  };

  const getTasksStats = () => {
    const allTasks = getAllTasks();
    const completed = allTasks.filter(t => t.completed).length;
    const total = allTasks.length;
    const pending = total - completed;
    return { completed, total, pending };
  };

  const getOverdueTasks = () => {
    const today = DateUtils.today();
    return getAllTasks().filter(task => task.dueDate < today && !task.completed);
  };

  const getTasksDueToday = () => {
    const today = DateUtils.today();
    return getAllTasks().filter(task => task.dueDate === today && !task.completed);
  };

  const stats = getTasksStats();

  return (
    <div className="mb-60 min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <Card className="mb-6 bg-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Study Planner</h1>
                <p className="mt-1 text-muted-foreground">Stay organized and lock in</p>
              </div>

              <div className="flex items-center gap-4">
                <Tabs value={activeView} onValueChange={setActiveView}>
                  <TabsList className="bg-card border-2">
                    <TabsTrigger value="subjects" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <List className="mr-2 h-4 w-4" />
                      Subjects
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Calendar
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <BarChart className="mr-2 h-4 w-4" />
                      Analytics
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <button
                  onClick={() => setIsDark(!isDark)}
                  className="p-2 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Card className="bg-[hsl(var(--yellow-muted))] border-0">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
                  <div className="text-sm font-medium text-muted-foreground">Pending Tasks</div>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(var(--positive))] border-0">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
                  <div className="text-sm font-medium text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(var(--negative))] border-0">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-foreground">{getOverdueTasks().length}</div>
                  <div className="text-sm font-medium text-muted-foreground">Overdue</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <FocusTimer onSessionComplete={addFocusSession} />
            <DailyTodos />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {getTasksDueToday().length > 0 && (
              <Card className="rounded-xl border-2 bg-secondary px-4 py-3 mb-6 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-foreground" />
                    <h2 className="text-xl font-bold text-foreground">Due Today</h2>
                  </div>
                  <div className="space-y-2">
                    {getTasksDueToday().map(task => (
                      <div key={task.id} className="backdrop-blur rounded-md p-3 flex items-center gap-3 bg-muted/50 border">
                        <span className={`w-3 h-3 rounded-full ${task.subjectColor}`}></span>
                        <span className="font-medium flex-1 text-foreground">{task.title}</span>
                        <span className="text-sm bg-muted px-2 py-1 rounded text-muted-foreground">{task.subjectName}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
        onCancel={cancelDelete}
      />
      <Analytics />
    </div>
  );
}

export default App;