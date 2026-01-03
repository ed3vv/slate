'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CheckSquare, Square, Trash2 } from 'lucide-react';
import { useDailyTodos } from '@/lib/useDailyTodos';
import { useAuth } from '@/lib/hooks';

export function DailyTodos() {
  const { user, loading: authLoading } = useAuth(false);
  const { todos, addTodo: addTodoDb, toggleTodo: toggleTodoDb, deleteTodo: deleteTodoDb } = useDailyTodos(!authLoading && !!user, user?.id);
  const [newTodo, setNewTodo] = useState<string>('');

  const addTodo = () => {
    if (newTodo.trim()) {
      addTodoDb(newTodo);
      setNewTodo('');
    }
  };

  const toggleTodo = (id: string) => {
    toggleTodoDb(id);
  };

  const deleteTodo = (id: string) => {
    deleteTodoDb(id);
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
                  todo.done ? 'opacity-50' : ''
                }`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleTodo(todo.id)}
                  className="h-8 w-8 hover:bg-transparent"
                >
                  {todo.done ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                </Button>
                <span className={`flex-1 text-sm text-foreground ${todo.done ? 'line-through' : ''}`}>
                  {todo.title}
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
