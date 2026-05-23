"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Users, Search, Paperclip } from "lucide-react";

export default function ChatPage() {
  const users = [
    { id: 1, name: "General Channel", type: "channel" },
    { id: 2, name: "GST Audit Team", type: "channel" },
    { id: 3, name: "Jane Smith", type: "direct", status: "online" },
    { id: 4, name: "Mike Ross", type: "direct", status: "offline" },
  ];

  const channels = [];
  const directMessages = [];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    if (u.type === 'channel') {
      channels.push(u);
    } else if (u.type === 'direct') {
      directMessages.push(u);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] space-x-6">
      {/* Sidebar */}
      <Card className="w-64 flex flex-col border-0 shadow-none border-r rounded-none">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1.5 mt-2">Channels</div>
          {channels.map(u => (
            <Button key={u.id} variant="ghost" className="w-full justify-start font-medium">
              <Users className="w-4 h-4 mr-2 text-muted-foreground" /> {u.name}
            </Button>
          ))}
          <div className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1.5 mt-4">Direct Messages</div>
          {directMessages.map(u => (
            <Button key={u.id} variant="ghost" className="w-full justify-start font-normal">
              <span className={`w-2 h-2 rounded-full mr-2 ${u.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              {u.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col border-0 shadow-none">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" /> GST Audit Team
          </h3>
        </div>
        <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">JS</div>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold text-sm">Jane Smith</span>
                <span className="text-xs text-muted-foreground">10:45 AM</span>
              </div>
              <div className="bg-muted p-3 rounded-lg rounded-tl-none mt-1 text-sm">
                Hey everyone, the portal is running slow today. Expect delays in GSTR-1 filings.
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 flex-row-reverse space-x-reverse">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">ME</div>
            <div className="text-right">
              <div className="flex items-baseline space-x-2 justify-end">
                <span className="text-xs text-muted-foreground">10:48 AM</span>
                <span className="font-semibold text-sm">You</span>
              </div>
              <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none mt-1 text-sm text-left">
                Noted. Let&apos;s inform the Acme Corp and TechFlow clients so they are aware.
              </div>
            </div>
          </div>
        </CardContent>
        <div className="p-4 border-t bg-muted/10">
          <div className="relative flex items-center">
            <Button variant="ghost" size="icon" className="absolute left-1"><Paperclip className="w-4 h-4 text-muted-foreground" /></Button>
            <input
              type="text"
              placeholder="Type a message..."
              className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-12 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button size="icon" className="absolute right-1 h-10 w-10"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}