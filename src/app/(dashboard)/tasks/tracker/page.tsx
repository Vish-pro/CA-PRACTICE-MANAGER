"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks } from "lucide-react";

const taskStatuses = ["PENDING", "IN PROGRESS", "REVIEW", "OVERDUE", "COMPLETED"];

const mockTasks = [
  { id: 1, title: "GST Filing - Oct", client: "Acme Corp", status: "PENDING", assignee: "John D." },
  { id: 2, title: "ITR Returns", client: "TechFlow Inc", status: "IN PROGRESS", assignee: "Jane S." },
  { id: 3, title: "Annual Audit", client: "Global Trade", status: "REVIEW", assignee: "Mike R." },
];

export default function LiveTaskTracker() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Task Tracker</h2>
          <p className="text-muted-foreground">Manage tasks, subtasks, and SOP checklists in real-time.</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline"><ListChecks className="w-4 h-4 mr-2" /> Bulk Reassign</Button>
          <Button><Plus className="w-4 h-4 mr-2" /> New Task</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1 pb-6 overflow-x-auto">
        {taskStatuses.map(status => (
          <div key={status} className="flex flex-col h-full bg-muted/30 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center justify-between text-muted-foreground">
              {status}
              <span className="bg-background px-2 py-0.5 rounded-full text-xs">
                {mockTasks.filter(t => t.status === status).length}
              </span>
            </h3>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {mockTasks.filter(t => t.status === status).map(task => (
                <Card key={task.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <p className="font-medium text-sm leading-tight">{task.title}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{task.client}</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{task.assignee}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {mockTasks.filter(t => t.status === status).length === 0 && (
                <div className="h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground/50 text-sm">
                  Drop here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}