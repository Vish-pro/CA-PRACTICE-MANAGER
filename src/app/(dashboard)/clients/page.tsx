"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2, Mail, Phone, Star } from "lucide-react";

export default function ClientOSPage() {
  const clients = [
    { id: 1, name: "Acme Corp", contact: "John Smith", email: "john@acme.com", phone: "+91 9876543210", rating: 4.5 },
    { id: 2, name: "TechFlow Inc", contact: "Sarah Lynn", email: "sarah@techflow.io", phone: "+91 9876543211", rating: 5.0 },
    { id: 3, name: "Global Trade Pvt Ltd", contact: "Mike Ross", email: "mike@globaltrade.in", phone: "+91 9876543212", rating: 3.8 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Client OS</h2>
          <p className="text-muted-foreground">360-degree view of your clients and contacts.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Client</Button>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-muted-foreground" />
                  {client.name}
                </CardTitle>
                <div className="flex items-center bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-semibold">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {client.rating}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Contact:</span> {client.contact}</p>
                <p className="flex items-center"><Mail className="w-4 h-4 mr-2" /> {client.email}</p>
                <p className="flex items-center"><Phone className="w-4 h-4 mr-2" /> {client.phone}</p>
              </div>
              <div className="mt-6 flex space-x-2">
                <Button variant="outline" className="w-full text-xs" size="sm">View Profile</Button>
                <Button variant="secondary" className="w-full text-xs" size="sm">Rate Client</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}