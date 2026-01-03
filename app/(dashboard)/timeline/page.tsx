"use client"

import { useState } from "react"
import { usePlannerData } from "@/lib/usePlannerData"
import type { TaskWithSubject, Task, SortBy } from '@/types'
import { TimelineView } from '@/components/ui/timeline-view'

export default function TimelineSection() {

    const { subjects, loading, error, updateTask, deleteTask } = usePlannerData()

    const getAllTasks = (): TaskWithSubject[] => {
        return subjects.flatMap(s => s.tasks.map(t => ({
        ...t,
        subjectName: s.name,
        subjectColor: s.color,
        subjectId: s.id
        })));
    };

    const [sortBy, setSortBy] = useState<SortBy>('dueDate');

    const toggleTaskComplete = async (subjectId: string, taskId: string) => {
        const subject = subjects.find(s => s.id === subjectId)
        const task = subject?.tasks.find(t => t.id === taskId)
        if (!task) return
        await updateTask(taskId, { completed: !task.completed })
    };

    const toggleTaskPin = async (subjectId: string, taskId: string) => {
        const subject = subjects.find(s => s.id === subjectId)
        const task = subject?.tasks.find(t => t.id === taskId)
        if (!task) return
        await updateTask(taskId, { pinned: !task.pinned })
    };

    const updateTaskHandler = async (_subjectId: string, taskId: string, updates: Partial<Task>) => {
        await updateTask(taskId, updates)
    }

    const deleteTaskHandler = async (_subjectId: string, taskId: string) => {
        await deleteTask(taskId)
    }

    const sortTasks = (tasks: Task[]): Task[] => {
        if (sortBy === 'priority') {
        const order = { high: 1, medium: 2, low: 3 };
        return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
        }
        return [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    };
    
    if (loading) {
        return <div className="p-6 text-foreground">Loading timeline...</div>
    }

    if (error) {
        return <div className="p-6 text-destructive">Error loading timeline: {error}</div>
    }
    
    return (
        <TimelineView
            tasks={getAllTasks()}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onToggleTask={toggleTaskComplete}
            onTogglePin={toggleTaskPin}
            onUpdateTask={updateTaskHandler}
            onDeleteTask={deleteTaskHandler}
            sortTasks={sortTasks}
        />
    )
}
