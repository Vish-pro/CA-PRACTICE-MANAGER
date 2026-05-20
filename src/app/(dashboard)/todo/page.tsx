"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

export default function TodoPage() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Call Rajesh regarding missing bank statements", done: false },
    { id: 2, text: "Review junior's draft for TechFlow audit", done: false },
    { id: 3, text: "Submit personal reimbursement for travel", done: true },
    { id: 4, text: "Prepare slides for internal team meeting", done: false },
  ]);

  const [newTodo, setNewTodo] = useState("");

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([{ id: Date.now(), text: newTodo, done: false }, ...todos]);
      setNewTodo("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 mt-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My To-Do List</h2>
        <p className="text-muted-foreground">Manage personal tasks and reminders independent of client workflows.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-2 mb-6">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button onClick={addTodo}><Plus className="w-4 h-4 mr-2" /> Add</Button>
          </div>

          <div className="space-y-1">
            {todos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                onClick={() => toggleTodo(todo.id)}
              >
                {todo.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={`text-sm ${todo.done ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                  {todo.text}
                </span>
              </div>
            ))}

            {todos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No personal to-do items. You&apos;re all caught up!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}