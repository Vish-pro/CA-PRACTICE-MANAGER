"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText, IndianRupee, Calendar } from "lucide-react";

export default function ActionCenterPage() {
  const approvals = [
    { id: 1, type: "Leave", title: "Sick Leave Application", requester: "Jane Smith", date: "Oct 20-22", icon: Calendar, color: "text-blue-600 bg-blue-100" },
    { id: 2, type: "Reimbursement", title: "Travel Expense - Client Visit", requester: "Mike Ross", amount: "₹2,500", icon: IndianRupee, color: "text-green-600 bg-green-100" },
    { id: 3, type: "Invoice", title: "Proforma Approval - Acme Corp", requester: "Billing Exec", amount: "₹45,000", icon: FileText, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Action Center</h2>
        <p className="text-muted-foreground">Centralized dashboard for all pending approvals across the firm.</p>
      </div>

      <div className="grid gap-4">
        {approvals.map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.type}</span>
                    </div>
                    <p className="font-semibold text-lg">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Requested by {item.requester} {item.date && `• ${item.date}`} {item.amount && `• ${item.amount}`}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button className="bg-green-600 text-white hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {approvals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>You&apos;re all caught up! No pending approvals.</p>
        </div>
      )}
    </div>
  );
}