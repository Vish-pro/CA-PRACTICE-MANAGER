"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, Key } from "lucide-react";

export default function DSCRegisterPage() {
  const dscs = [
    { id: 1, client: "Acme Corp", holder: "John Smith", expiry: "2023-10-25", location: "Drawer A", status: "EXPIRING_SOON" },
    { id: 2, client: "TechFlow Inc", holder: "Sarah Lynn", expiry: "2024-05-12", location: "With Client", status: "ACTIVE" },
    { id: 3, client: "Global Trade", holder: "Mike Ross", expiry: "2023-09-10", location: "Locker 2", status: "EXPIRED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">DSC Register</h2>
          <p className="text-muted-foreground">Manage client Digital Signature Certificates and expiry alerts.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Add DSC</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Holder Name</th>
                <th className="px-6 py-4 font-medium">Expiry Date</th>
                <th className="px-6 py-4 font-medium">Physical Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dscs.map((dsc) => (
                <tr key={dsc.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium text-foreground">{dsc.client}</td>
                  <td className="px-6 py-4 flex items-center"><Key className="w-4 h-4 mr-2 text-muted-foreground" />{dsc.holder}</td>
                  <td className="px-6 py-4">{dsc.expiry}</td>
                  <td className="px-6 py-4">{dsc.location}</td>
                  <td className="px-6 py-4">
                    {dsc.status === 'ACTIVE' && <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-medium">Active</span>}
                    {dsc.status === 'EXPIRING_SOON' && <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center w-max"><AlertTriangle className="w-3 h-3 mr-1" /> Expiring Soon</span>}
                    {dsc.status === 'EXPIRED' && <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center w-max"><AlertTriangle className="w-3 h-3 mr-1" /> Expired</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm">Renew</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}