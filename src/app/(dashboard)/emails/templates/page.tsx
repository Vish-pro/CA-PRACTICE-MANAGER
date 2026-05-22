"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function EmailTemplatesPage() {
  const templates = [
    { id: 1, name: "Invoice Reminder", subject: "Payment Reminder: Invoice #{invoice_no}" },
    { id: 2, document: "Document Request", subject: "Required Documents for {service_name}" },
    { id: 3, name: "Welcome Email", subject: "Welcome to Prabandh CA Firm" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Templates</h2>
          <p className="text-muted-foreground">Manage templates for automated reminders and quick replies.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="text-lg">{template.name || template.document}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Subject:</span> {template.subject}</p>
              </div>
              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" className="w-full">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}