"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, XCircle, FileText, IndianRupee, Calendar, 
  Clock, Users, ShieldCheck, AlertCircle, Play, UserCheck
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

// --- Types & Interfaces (shapes returned by /api/hr/*) ---
interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: "SICK" | "CASUAL" | "EARNED";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user?: { id: string; name: string; employeeCode?: string | null; employmentType?: string | null };
}

interface TimesheetLog {
  id: string;
  userId: string;
  date: string;
  taskTitle: string;
  clientName?: string | null;
  hours: number;
  description?: string | null;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  user?: { id: string; name: string; employeeCode?: string | null; employmentType?: string | null };
}

interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  clientName: string;
  startTime: number;
  elapsedBefore: number;
  isRunning: boolean;
}

export default function ActionCenterPage() {
  const [userRole, setUserRole] = useState<string>("CLERK");
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<TimesheetLog[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<{ count: number; amount: number } | null>(null);
  const [currentUserTimer, setCurrentUserTimer] = useState<ActiveTimer | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [mockKunalSeconds, setMockKunalSeconds] = useState<number>(6124); // ~1h 42m
  const [mockMeeraSeconds, setMockMeeraSeconds] = useState<number>(1425); // ~23m

  // Fetch overdue invoice stats from real API
  useEffect(() => {
    fetch("/api/billing/invoices?status=UNPAID&limit=1")
      .then(r => r.json())
      .then(json => {
        if (json.stats) {
          setOverdueInvoices({ count: json.stats.overdueCount, amount: json.stats.unpaidAmount });
        }
      })
      .catch(() => {});
  }, []);

  // 1. Initial State Loading & Storage Event Synchronization
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Approval queues come from the database; manager sees only article assistants,
      // partners/admin/HR see everything, others see nothing.
      const loadApprovalQueues = async (storedRole: string) => {
        try {
          const [leavesRes, tsRes] = await Promise.all([
            fetch("/api/hr/leaves?status=PENDING"),
            fetch("/api/hr/timesheets?status=PENDING"),
          ]);
          const leavesJson = await leavesRes.json();
          const tsJson = await tsRes.json();
          const allLeaves: LeaveRequest[] = leavesJson.data || [];
          const allTimesheets: TimesheetLog[] = tsJson.data || [];

          if (storedRole === "MANAGER") {
            setPendingLeaves(allLeaves.filter(req => req.user?.employmentType === "Article Assistant"));
            setPendingTimesheets(allTimesheets.filter(log => log.user?.employmentType === "Article Assistant"));
          } else if (["ADMIN", "PARTNER", "DIRECTOR", "HR"].includes(storedRole)) {
            setPendingLeaves(allLeaves);
            setPendingTimesheets(allTimesheets);
          } else {
            setPendingLeaves([]);
            setPendingTimesheets([]);
          }
        } catch (e) {
          console.error("Failed to load approval queues", e);
        }
      };

      const loadState = () => {
        // Fetch simulated role
        const storedRole = localStorage.getItem("prabandh_simulated_role") || "CLERK";
        setUserRole(storedRole);

        loadApprovalQueues(storedRole);

        // Fetch user active timer (live stopwatch stays in localStorage)
        const storedTimer = localStorage.getItem("ca_active_timer");
        if (storedTimer) {
          const parsed = JSON.parse(storedTimer) as ActiveTimer;
          setCurrentUserTimer(parsed);
          if (parsed.isRunning) {
            setSecondsElapsed(Math.floor((Date.now() - parsed.startTime) / 1000) + parsed.elapsedBefore);
          } else {
            setSecondsElapsed(parsed.elapsedBefore);
          }
        } else {
          setCurrentUserTimer(null);
          setSecondsElapsed(0);
        }
      };

      loadState();
      window.addEventListener("storage", loadState);
      window.addEventListener("attendance-change", loadState as EventListener);
      return () => {
        window.removeEventListener("storage", loadState);
        window.removeEventListener("attendance-change", loadState as EventListener);
      };
    }
  }, []);

  // 2. Real-time Tickers
  useEffect(() => {
    const timer = setInterval(() => {
      // Tick User Timer
      if (currentUserTimer && currentUserTimer.isRunning) {
        setSecondsElapsed(prev => prev + 1);
      }
      // Tick Mock Timers to keep UI alive
      setMockKunalSeconds(prev => prev + 1);
      setMockMeeraSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUserTimer]);

  // 3. Approval Handlers (persist to database; "leaves taken" is derived from approved leaves)
  const handleLeaveApproval = async (id: string, action: "APPROVED" | "REJECTED") => {
    const res = await fetch(`/api/hr/leaves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) {
      setPendingLeaves(prev => prev.filter(req => req.id !== id));
      toast.success(`Leave request successfully ${action.toLowerCase()}!`);
    } else {
      toast.error("Failed to update leave request");
    }
  };

  const handleTimesheetApproval = async (id: string, action: "APPROVED" | "REJECTED") => {
    const res = await fetch(`/api/hr/timesheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    if (res.ok) {
      setPendingTimesheets(prev => prev.filter(log => log.id !== id));
      toast.success(`Daily timesheet successfully ${action.toLowerCase()}!`);
    } else {
      toast.error("Failed to update timesheet");
    }
  };

  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const isPartnerOrManager = ["ADMIN", "PARTNER", "DIRECTOR", "MANAGER"].includes(userRole);
  const totalApprovalsCount = pendingLeaves.length + pendingTimesheets.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Block */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Action Center</h2>
        <p className="text-muted-foreground text-sm mt-1">Centralized review board for firm operations, subordinate leaves, and billable timesheets.</p>
      </div>

      {/* Overdue Invoice Alert */}
      {overdueInvoices && overdueInvoices.count > 0 && (
        <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-red-800 text-sm">
              {overdueInvoices.count} Overdue Invoice{overdueInvoices.count !== 1 ? "s" : ""}
            </div>
            <div className="text-xs text-red-600 mt-0.5">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(overdueInvoices.amount)} pending — past due date
            </div>
          </div>
          <a
            href="/billing/invoices"
            className="shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            View Invoices →
          </a>
        </div>
      )}

      {/* A. LIVE TEAM WORK TRACKER (Only for Partners/Supervisors) */}
      {isPartnerOrManager && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3.5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                ⚡ Live Team Work Tracker
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time stopwatch logs of staff members currently working on client projects.</p>
            </div>
            <Users className="w-5 h-5 text-primary" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 uppercase text-muted-foreground font-bold border-b">
                <tr>
                  <th className="px-3 py-3">Team Member</th>
                  <th className="px-3 py-3">Engagement (Task Description)</th>
                  <th className="px-3 py-3">Client Target</th>
                  <th className="px-3 py-3 text-center">Stopwatch Timer</th>
                  <th className="px-3 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* 1. Mock Kunal Sen */}
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-3.5 font-bold text-foreground">Kunal Sen (Article)</td>
                  <td className="px-3 py-3.5 text-muted-foreground">GST October Return filing SOP</td>
                  <td className="px-3 py-3.5 font-mono text-muted-foreground">Acme Corp (#TSK00005)</td>
                  <td className="px-3 py-3.5 text-center font-mono font-bold text-red-500 animate-pulse">
                    {formatSeconds(mockKunalSeconds)}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                      Recording
                    </span>
                  </td>
                </tr>

                {/* 2. Mock Meera Nair */}
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-3.5 font-bold text-foreground">Meera Nair (Article)</td>
                  <td className="px-3 py-3.5 text-muted-foreground">Income Tax Return Verification</td>
                  <td className="px-3 py-3.5 font-mono text-muted-foreground">TechFlow Inc (#TSK00002)</td>
                  <td className="px-3 py-3.5 text-center font-mono font-bold text-red-500 animate-pulse">
                    {formatSeconds(mockMeeraSeconds)}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                      Recording
                    </span>
                  </td>
                </tr>

                {/* 3. User's own live timer if running */}
                {currentUserTimer && (
                  <tr className="bg-primary/5 hover:bg-primary/10 transition-colors border-t border-primary/20">
                    <td className="px-3 py-3.5 font-bold text-primary">
                      {userRole === "MANAGER" ? "Neha Gupta" : (["ADMIN", "PARTNER", "DIRECTOR"].includes(userRole) ? "Vikramaditya Rao" : "Kunal Sen")} (Self)
                    </td>
                    <td className="px-3 py-3.5 text-primary/95">{currentUserTimer.taskTitle}</td>
                    <td className="px-3 py-3.5 font-mono text-primary/80">{currentUserTimer.clientName}</td>
                    <td className="px-3 py-3.5 text-center font-mono font-extrabold text-red-600 dark:text-red-400 animate-pulse">
                      {formatSeconds(secondsElapsed)}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                        {currentUserTimer.isRunning ? "Active" : "Paused"}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B. PENDING APPROVALS QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            📥 Subordinate Action Queue
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-extrabold">
              {totalApprovalsCount} Pending
            </span>
          </h3>
        </div>

        <div className="grid gap-4">
          {/* 1. Leave Requests Approvals */}
          {pendingLeaves.map(item => (
            <Card key={item.id} className="hover:border-primary transition-all duration-300">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3.5 rounded-2xl text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-950 flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-950 px-2 py-0.5 rounded">
                        {item.type} LEAVE REQUEST
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">#{item.id}</span>
                    </div>
                    <p className="font-extrabold text-base text-foreground mt-1.5">Apply for {item.type.toLowerCase()} leave</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Requester: <span className="font-semibold text-foreground">{item.user?.name || "—"}</span> ({item.user?.employeeCode || "—"}) • Period: <span className="font-semibold text-foreground">{new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground/90 italic leading-relaxed mt-1 bg-muted/30 p-2 rounded-lg border border-border/40">
                      &quot;{item.reason}&quot;
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 self-end md:self-center">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-950/40 text-xs font-bold uppercase rounded-xl"
                    onClick={() => handleLeaveApproval(item.id, "REJECTED")}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700 text-xs font-bold uppercase rounded-xl"
                    onClick={() => handleLeaveApproval(item.id, "APPROVED")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 2. Timesheets Approvals */}
          {pendingTimesheets.map(item => (
            <Card key={item.id} className="hover:border-primary transition-all duration-300">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3.5 rounded-2xl text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950 flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950 px-2 py-0.5 rounded">
                        DAILY TIMESHEET CARD
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">#{item.id}</span>
                    </div>
                    <p className="font-extrabold text-base text-foreground mt-1.5">
                      Log {item.hours.toFixed(2)} hrs on {item.taskTitle}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Staff Member: <span className="font-semibold text-foreground">{item.user?.name || "—"}</span> ({item.user?.employeeCode || "—"}) • Client: <span className="font-semibold text-foreground">{item.clientName || "—"}</span> • Date: <span className="font-semibold text-foreground">{new Date(item.date).toLocaleDateString()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground/90 italic leading-relaxed mt-1 bg-muted/30 p-2 rounded-lg border border-border/40">
                      &quot;{item.description}&quot;
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 self-end md:self-center">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-950/40 text-xs font-bold uppercase rounded-xl"
                    onClick={() => handleTimesheetApproval(item.id, "REJECTED")}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700 text-xs font-bold uppercase rounded-xl"
                    onClick={() => handleTimesheetApproval(item.id, "APPROVED")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {totalApprovalsCount === 0 && (
          <div className="bg-card border rounded-2xl py-12 text-center text-muted-foreground shadow-sm max-w-lg mx-auto flex flex-col items-center justify-center space-y-3">
            <UserCheck className="w-12 h-12 text-primary opacity-20 animate-pulse" />
            <h4 className="font-bold text-sm text-foreground">You&apos;re completely up to date!</h4>
            <p className="text-xs max-w-xs text-muted-foreground leading-relaxed">
              No pending staff leave applications or autogenerated timesheet approvals require your review right now.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
