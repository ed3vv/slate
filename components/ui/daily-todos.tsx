'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CheckSquare, Square, Trash2 } from 'lucide-react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export function DailyTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const [newTodo, setNewTodo] = useState<string>('');

  // Hydrate from localStorage after mount to avoid SSR/client mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('dailyTodos');
    setTodos(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dailyTodos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: newTodo,
        completed: false
      }]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <Card className="mt-6 bg-card text-foreground shadow-md">
      <CardHeader>
        <CardTitle className="text-foreground">Daily Todo List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Add a quick task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            className="bg-input"
          />
          <Button onClick={addTodo} size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-256 overflow-y-auto">
          {todos.length === 0 ? (
            <p className="text-center py-4 text-sm text-muted-foreground">
              No quick tasks yet!
            </p>
          ) : (
            todos.map(todo => (
              <div
                key={todo.id}
                className={`flex items-center gap-2 p-2 rounded-md bg-secondary hover:opacity-80 transition-colors ${
                  todo.completed ? 'opacity-50' : ''
                }`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleTodo(todo.id)}
                  className="h-8 w-8 hover:bg-transparent"
                >
                  {todo.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                </Button>
                <span className={`flex-1 text-sm text-foreground ${todo.completed ? 'line-through' : ''}`}>
                  {todo.text}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                  className="h-8 w-8 hover:text-destructive hover:bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
