"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Send, CheckCircle2, Clock } from "lucide-react";

export default function InvoicesPage() {
  const invoices = [
    { id: "INV-2023-001", client: "Acme Corp", amount: "₹45,000", status: "UNPAID", date: "Oct 12, 2023", type: "REAL" },
    { id: "PRO-2023-089", client: "TechFlow Inc", amount: "₹12,500", status: "PROFORMA", date: "Oct 15, 2023", type: "PROFORMA" },
    { id: "INV-2023-002", client: "Global Trade", amount: "₹85,000", status: "PAID", date: "Sep 28, 2023", type: "REAL" },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'UNPAID': return 'bg-red-100 text-red-800';
      case 'PROFORMA': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PAID': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'UNPAID': return <Clock className="w-3 h-3 mr-1" />;
      case 'PROFORMA': return <FileText className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage proforma and real invoices, and track payments.</p>
        </div>
        <div className="space-x-2">
          <Button variant="secondary"><Plus className="w-4 h-4 mr-2" /> New Proforma</Button>
          <Button><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Invoice ID</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Issue Date</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium text-foreground">{inv.id}</td>
                    <td className="px-6 py-4">{inv.client}</td>
                    <td className="px-6 py-4">{inv.date}</td>
                    <td className="px-6 py-4 font-bold">{inv.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                        {getStatusIcon(inv.status)}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {inv.type === 'PROFORMA' && (
                        <Button variant="outline" size="sm">Convert to Real</Button>
                      )}
                      {inv.status === 'UNPAID' && (
                        <Button variant="outline" size="sm">Record Payment</Button>
                      )}
                      <Button variant="ghost" size="icon"><Send className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}