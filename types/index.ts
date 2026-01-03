export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: Priority;
  pinned: boolean;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  expanded: boolean;
  tasks: Task[];
}

export interface TaskWithSubject extends Task {
  subjectName: string;
  subjectColor: string;
  subjectId: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  color: string;
}

export interface FocusSession {
  date: string;
  duration: number;
  timestamp: number;
}

export interface TaskStats {
  completed: number;
  total: number;
  pending: number;
}

export type SortBy = 'dueDate' | 'priority';
