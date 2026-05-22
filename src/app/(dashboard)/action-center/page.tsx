"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText, IndianRupee, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";

type ApprovalItem = {
  id: string;
  type: string;
  title: string;
  requester: string;
  date?: string;
  amount?: string;
};

export default function ActionCenterPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const res = await fetch("/api/action-center");
        if (!res.ok) throw new Error("Failed to fetch approvals");
        const data = await res.json();
        setApprovals(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load approvals");
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, []);

  const handleAction = async (id: string, type: string, action: "APPROVED" | "REJECTED") => {
    const previousApprovals = [...approvals];
    setApprovals(approvals.filter((item) => item.id !== id));

    try {
      let endpoint = "";
      if (type === "Leave") {
        endpoint = `/api/hr/leaves/${id}`;
      } else if (type === "Reimbursement") {
        endpoint = `/api/hr/reimbursements/${id}`;
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`${type} ${action.toLowerCase()} successfully`);
    } catch (error) {
      console.error(error);
      setApprovals(previousApprovals);
      toast.error(`Failed to ${action.toLowerCase()} ${type.toLowerCase()}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Leave":
        return Calendar;
      case "Reimbursement":
        return IndianRupee;
      case "Invoice":
        return FileText;
      default:
        return FileText;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "Leave":
        return "text-blue-600 bg-blue-100";
      case "Reimbursement":
        return "text-green-600 bg-green-100";
      case "Invoice":
        return "text-purple-600 bg-purple-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Action Center</h2>
        <p className="text-muted-foreground">Centralized dashboard for all pending approvals across the firm.</p>
      </div>

      <div className="grid gap-4">
        {approvals.map((item) => {
          const Icon = getIcon(item.type);
          const color = getColor(item.type);
          return (
            <Card key={item.id} className="hover:border-primary transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${color}`}>
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
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleAction(item.id, item.type, "REJECTED")}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleAction(item.id, item.type, "APPROVED")}
                  >
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
