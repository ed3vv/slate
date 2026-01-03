"use client"

import { useState } from 'react'
import { SubjectsView } from '@/components/ui/subjects-view'
import { usePlannerData } from '@/lib/usePlannerData'
import { DateUtils } from '@/lib/dateUtils'
import type { Subject, SortBy, Priority, Task } from '@/types'

export default function SubjectsSection() {

    const [sortBy, setSortBy] = useState<SortBy>("dueDate")

    const { subjects, loading, error, addSubject, updateSubject, deleteSubject, addTask, updateTask, deleteTask } = usePlannerData()

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
  
    if (loading) {
        return <div className="p-6 text-foreground">Loading your planner...</div>
    }

    if (error) {
        return <div className="p-6 text-destructive">Error loading planner: {error}</div>
    }

    return (
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
    )
}
