"use client";

import { CalendarView } from '@/components/ui/calendar-view'
import type { TaskWithSubject } from '@/types'
import { usePlannerData } from '@/lib/usePlannerData';
import { useEventsData } from '@/lib/useEventsData';
import { useAuth } from '@/lib/hooks'

export default function CalendarSection() {
    const { user, loading: authLoading } = useAuth(true)
    const { subjects, loading, error } = usePlannerData(!authLoading && !!user, user?.id)
    const { events, addEvent, deleteEvent } = useEventsData(!authLoading && !!user, user?.id)

    const getAllTasks = (): TaskWithSubject[] => {
        return subjects.flatMap(s => s.tasks.map(t => ({
            ...t,
            subjectName: s.name,
            subjectColor: s.color,
            subjectId: s.id
        })));
    };

    const handleAddEvent = (eventData: Omit<any, 'id'>) => {
        addEvent(eventData.title, eventData.date, eventData.color);
    };

    if (authLoading || loading) {
        return <div className="p-6 text-foreground">Loading calendar...</div>
    }

    if (error) {
        return <div className="p-6 text-destructive">Error loading calendar: {error}</div>
    }

    return (
        <CalendarView
            tasks={getAllTasks()}
            events={events}
            onAddEvent={handleAddEvent}
            onDeleteEvent={deleteEvent}
        />
    )
}
