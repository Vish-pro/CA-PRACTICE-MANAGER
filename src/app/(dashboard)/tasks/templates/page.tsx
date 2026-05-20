"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Repeat, ListTodo } from "lucide-react";

export default function TaskTemplatesPage() {
  const templates = [
    { id: 1, title: "Monthly GST Filing (GSTR-3B)", category: "GST", isRecurring: true, sops: 4 },
    { id: 2, title: "Annual Income Tax Return (ITR-4)", category: "ITR", isRecurring: true, sops: 8 },
    { id: 3, title: "TDS Return Filing", category: "TDS", isRecurring: true, sops: 5 },
    { id: 4, title: "Company Incorporation", category: "ROC", isRecurring: false, sops: 12 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Recurring Tasks & SOPs</h2>
          <p className="text-muted-foreground">Manage task templates, configure recurring rules, and define SOP checklists.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Create Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg leading-tight">{template.title}</CardTitle>
                <span className="bg-muted px-2 py-1 rounded text-xs font-medium">{template.category}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 text-sm text-muted-foreground mt-2">
                {template.isRecurring && (
                  <div className="flex items-center text-primary">
                    <Repeat className="w-4 h-4 mr-1" />
                    Recurring
                  </div>
                )}
                <div className="flex items-center">
                  <ListTodo className="w-4 h-4 mr-1" />
                  {template.sops} SOPs defined
                </div>
              </div>
              <div className="mt-6 flex space-x-2">
                <Button variant="outline" className="w-full">Edit SOPs</Button>
                <Button variant="secondary" className="w-full">Use Template</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}