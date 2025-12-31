'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { DateUtils } from '@/lib/dateUtils';
import type { TaskWithSubject, Event } from '@/types';

interface CalendarViewProps {
  tasks: TaskWithSubject[];
  events: Event[];
  onAddEvent: (event: Omit<Event, 'id'>) => void;
  onDeleteEvent: (eventId: number) => void;
}

export function CalendarView({ tasks, events, onAddEvent, onDeleteEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showAddEvent, setShowAddEvent] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [newEventTime, setNewEventTime] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleAddEvent = () => {
    if (newEventTitle.trim() && newEventDate) {
      onAddEvent({
        title: newEventTitle,
        date: newEventDate,
        color: '',
        time: newEventTime
      } as Omit<Event, 'id'>);
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventTime('');
      setShowAddEvent(false);
    }
  };

  const getItemsForDate = (date: Date | null): { tasks: TaskWithSubject[]; events: Event[] } => {
    if (!date) return { tasks: [], events: [] };
    const dateStr = date.toLocaleDateString('en-CA');
    const dayTasks = tasks.filter(t => t.dueDate === dateStr && !t.completed);
    const dayEvents = events.filter(e => e.date === dateStr);
    return { tasks: dayTasks, events: dayEvents };
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = DateUtils.today();

  return (
    <Card className="shadow-md bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">{monthName}</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              variant="outline"
              className="bg-secondary hover:bg-secondary/80"
            >
              ←
            </Button>
            <Button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              variant="outline"
              className="bg-secondary hover:bg-secondary/80"
            >
              →
            </Button>
            <Button
              onClick={() => setShowAddEvent(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>

        {showAddEvent && (
          <div className="rounded-md p-4 mb-4 space-y-3 bg-secondary">
            <Input
              type="text"
              placeholder="Event title..."
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="bg-input"
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="flex-1 bg-input"
              />
              <Input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="bg-input"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddEvent}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Add Event
              </Button>
              <Button
                onClick={() => { setShowAddEvent(false); setNewEventTitle(''); setNewEventDate(''); setNewEventTime(''); }}
                variant="outline"
                className="bg-secondary hover:bg-secondary/80"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-bold py-2 text-foreground">
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }

            const dateStr = day.toLocaleDateString('en-CA');
            const isToday = dateStr === today;
            const { tasks: dayTasks, events: dayEvents } = getItemsForDate(day);
            const hasItems = dayTasks.length > 0 || dayEvents.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={`aspect-square border-2 rounded-md p-2 cursor-pointer transition-all overflow-hidden flex flex-col ${
                  isToday ? 'bg-secondary' : 'bg-card'
                }`}
                onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {day.getDate()}
                </div>
                {hasItems && (
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 4).map(event => (
                      <div key={event.id} className="text-xs truncate px-1 rounded bg-[hsl(var(--event))] text-white">
                        {event.title}
                      </div>
                    ))}
                    {dayTasks.slice(0, Math.max(0, 4 - dayEvents.length)).map(task => (
                      <div key={task.id} className={`text-xs truncate px-1 rounded ${task.subjectColor} text-white`}>
                        {task.title}
                      </div>
                    ))}

                    {(dayTasks.length + dayEvents.length > 4) && (
                      <div className="text-xs text-muted-foreground">+{dayTasks.length + dayEvents.length - 4} more</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-6 rounded-md p-4 bg-secondary">
            <h3 className="text-lg font-bold mb-3 text-foreground">
              {DateUtils.fromString(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            {getItemsForDate(DateUtils.fromString(selectedDate)).tasks.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2 text-foreground">Tasks:</h4>
                <div className="space-y-2">
                  {getItemsForDate(DateUtils.fromString(selectedDate)).tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 rounded p-2 bg-card">
                      <span className={`w-3 h-3 rounded-full ${task.subjectColor}`}></span>
                      <span className="flex-1 text-foreground">{task.title}</span>
                      <span className="text-xs text-muted-foreground">{task.subjectName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {getItemsForDate(DateUtils.fromString(selectedDate)).events.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-foreground">Events:</h4>
                <div className="space-y-2">
                  {getItemsForDate(DateUtils.fromString(selectedDate)).events.map(event => (
                    <div key={event.id} className="flex items-center justify-between rounded p-2 bg-card">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-foreground" />
                        <span className="text-foreground">{event.title}</span>
                        {(event as any).time && <span className="text-sm text-muted-foreground">{(event as any).time}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteEvent(event.id)}
                        className="h-8 w-8 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {getItemsForDate(DateUtils.fromString(selectedDate)).tasks.length === 0 &&
             getItemsForDate(DateUtils.fromString(selectedDate)).events.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">No tasks or events for this day</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
