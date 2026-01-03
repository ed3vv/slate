"use client";

import { CalendarView } from '@/components/ui/calendar-view'
import type { TaskWithSubject, Event } from '@/types'
import { useLocalStorage } from '@/lib/hooks';
import { usePlannerData } from '@/lib/usePlannerData';


export default function CalendarSection() {


    const { subjects, loading, error } = usePlannerData()

    const getAllTasks = (): TaskWithSubject[] => {
        return subjects.flatMap(s => s.tasks.map(t => ({
        ...t,
        subjectName: s.name,
        subjectColor: s.color,
        subjectId: s.id
        })));
    };

    const [events, setEvents] = useLocalStorage<Event[]>('plannerEvents', []);

    const addEvent = (eventData: Omit<Event, 'id'>) => {
        setEvents([...events, { ...eventData, id: Date.now() }]);
    };

    const deleteEvent = (eventId: number) => {
        setEvents(events.filter(e => e.id !== eventId));
    };

    if (loading) {
        return <div className="p-6 text-foreground">Loading calendar...</div>
    }

    if (error) {
        return <div className="p-6 text-destructive">Error loading calendar: {error}</div>
    }

    return (
        <CalendarView
            tasks={getAllTasks()}
            events={events}
            onAddEvent={addEvent}
            onDeleteEvent={deleteEvent}
        />
    )
}
