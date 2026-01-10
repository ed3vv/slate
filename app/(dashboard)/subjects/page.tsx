"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SubjectsView } from '@/components/ui/subjects-view'
import { FullscreenClock } from '@/components/ui/fullscreen-clock'
import { usePlannerData } from '@/lib/usePlannerData'
import { DateUtils } from '@/lib/dateUtils'
import { useAuth } from '@/lib/hooks'
import type { Subject, SortBy, Priority, Task } from '@/types'

export default function SubjectsSection() {

    const router = useRouter()
    const searchParams = useSearchParams()
    const showClock = searchParams.get('clock') === '1'
    const [sortBy, setSortBy] = useState<SortBy>("dueDate")

    const { user, loading: authLoading } = useAuth(true)

    const { subjects, loading, error, addSubject, updateSubject, deleteSubject, addTask, updateTask, deleteTask } = usePlannerData(!authLoading && !!user, user?.id)

    const toggleSubject = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId)
        if (!subject) return
        await updateSubject(subjectId, { expanded: !subject.expanded })
    }
    
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

    const addTaskHandler = async (subjectId: string, taskTitle: string, dueDate: string, priority: Priority) => {
        if (!taskTitle.trim()) return
        await addTask(subjectId, taskTitle, dueDate || DateUtils.today(), priority || 'medium')
    }

    const addSubjectHandler = async (subjectName: string, color: string) => {
        await addSubject(subjectName, color)
    }

    const updateTaskHandler = async (_subjectId: string, taskId: string, updates: Partial<Task>) => {
        await updateTask(taskId, updates)
    }

    const updateSubjectHandler = async (subjectId: string, updates: Partial<Subject>) => {
        await updateSubject(subjectId, updates)
    }

    const deleteTaskHandler = async (_subjectId: string, taskId: string) => {
        await deleteTask(taskId)
    }

    const deleteSubjectHandler = async (subjectId: string) => {
        await deleteSubject(subjectId)
    }

    const sortTasks = (tasks: Task[]): Task[] => {
        if (sortBy === 'priority') {
        const order = { high: 1, medium: 2, low: 3 };
        return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
        }
        return [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    };
  
    if (authLoading || loading) {
        return <div className="p-6 text-foreground">Loading your planner...</div>
    }

    if (error) {
        return <div className="p-6 text-destructive">Error loading planner: {error}</div>
    }

    return (
        <>
            <SubjectsView
                subjects={subjects}
                sortBy={sortBy}
                setSortBy={setSortBy}
                onToggle={toggleSubject}
                onToggleTask={toggleTaskComplete}
                onTogglePin={toggleTaskPin}
                onAddTask={addTaskHandler}
                onAddSubject={addSubjectHandler}
                onUpdateTask={updateTaskHandler}
                onUpdateSubject={updateSubjectHandler}
                onDeleteTask={deleteTaskHandler}
                onDeleteSubject={deleteSubjectHandler}
                sortTasks={sortTasks}
            />
            {showClock && (
                <div className="fixed inset-0 z-50">
                    <FullscreenClock onClose={() => router.replace('/subjects')} />
                </div>
            )}
        </>
    )
}
