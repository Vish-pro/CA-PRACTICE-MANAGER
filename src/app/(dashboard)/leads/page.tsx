"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Phone, Mail } from "lucide-react";

export default function LeadsPage() {
  const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

  const mockLeads = [
    { id: 1, name: "Retail Solutions Ltd", source: "Website", status: "NEW", phone: "+91 9988776655" },
    { id: 2, name: "Startup Hub", source: "Referral", status: "CONTACTED", phone: "+91 8877665544" },
    { id: 3, name: "Rajesh Hardware", source: "Walk-in", status: "QUALIFIED", phone: "+91 7766554433" },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lead Management</h2>
          <p className="text-muted-foreground">Capture, assign, and track leads through your sales pipeline.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Lead</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1 pb-6 overflow-x-auto">
        {leadStatuses.map(status => (
          <div key={status} className="flex flex-col h-full bg-muted/30 rounded-xl p-4 min-w-[250px]">
            <h3 className="font-semibold text-sm mb-4 flex items-center justify-between text-muted-foreground">
              {status}
              <span className="bg-background px-2 py-0.5 rounded-full text-xs">
                {mockLeads.filter(l => l.status === status).length}
              </span>
            </h3>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {mockLeads.filter(l => l.status === status).map(lead => (
                <Card key={lead.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <p className="font-medium text-sm leading-tight flex items-start justify-between">
                      {lead.name}
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {lead.phone}</div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[10px] uppercase font-bold">{lead.source}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {mockLeads.filter(l => l.status === status).length === 0 && (
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