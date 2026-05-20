"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Reply, PlusCircle, Inbox, Send, Archive } from "lucide-react";

export default function EmailsPage() {
  const emails = [
    { id: 1, subject: "Need GST Challan", sender: "john@acme.com", time: "10:30 AM", read: false },
    { id: 2, subject: "Re: Audit Report Draft", sender: "sarah@techflow.io", time: "Yesterday", read: true },
    { id: 3, subject: "Invoice Payment Done", sender: "mike@globaltrade.in", time: "Oct 12", read: true },
  ];

  return (
    <div className="flex h-[calc(100vh-10rem)] space-x-6">
      {/* Sidebar */}
      <div className="w-64 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Mailbox</h2>
        <nav className="space-y-1">
          <Button variant="secondary" className="w-full justify-start"><Inbox className="mr-2 h-4 w-4" /> Inbox (1)</Button>
          <Button variant="ghost" className="w-full justify-start"><Send className="mr-2 h-4 w-4" /> Sent</Button>
          <Button variant="ghost" className="w-full justify-start"><Archive className="mr-2 h-4 w-4" /> Archive</Button>
        </nav>
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/emails/templates'}><Mail className="mr-2 h-4 w-4" /> Manage Templates</Button>
        </div>
      </div>

      {/* List */}
      <div className="w-80 border-l border-r px-4 overflow-y-auto">
        <div className="space-y-2">
          {emails.map(email => (
            <Card key={email.id} className={`cursor-pointer ${!email.read ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm truncate pr-2 ${!email.read ? 'font-bold' : 'font-medium'}`}>{email.sender}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{email.time}</span>
                </div>
                <p className={`text-sm truncate ${!email.read ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{email.subject}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Reader */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">Need GST Challan</h3>
              <p className="text-sm text-muted-foreground mt-1">From: john@acme.com &lt;john@acme.com&gt;</p>
            </div>
            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Convert to Task</Button>
          </div>
        </div>
        <div className="p-6 flex-1 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
          Hi Team,

          Could you please share the GST challan for the month of September? We need to process the payment today.

          Thanks,
          John Smith
        </div>
        <div className="p-4 border-t bg-muted/20">
          <div className="flex space-x-2">
            <Button variant="secondary"><Reply className="mr-2 h-4 w-4" /> Reply</Button>
            <Button variant="outline">Use Template</Button>
          </div>
        </div>
      </div>
    </div>
  );
}