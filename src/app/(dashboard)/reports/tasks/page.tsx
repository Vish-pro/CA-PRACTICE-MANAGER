"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line
} from "recharts";
import { format } from "date-fns";
import {
  AlertCircle, Clock, CheckCircle, Activity, Play, Send,
  Users, Layers, ArrowUpRight, Zap, Filter, HelpCircle,
  FileText, Calendar, BellRing, RefreshCw, Sparkles, Check
} from "lucide-react";

// ── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#6366f1", // Indigo
  green:   "#10b981", // Emerald
  orange:  "#f59e0b", // Amber
  red:     "#ef4444", // Red
  blue:    "#3b82f6", // Blue
  purple:  "#8b5cf6", // Purple
  cyan:    "#06b6d4", // Cyan
  slate:   "#64748b", // Slate
};

const CHART_COLORS = [COLORS.primary, COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.orange, COLORS.green];

const SEVERITY_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  CRITICAL: { bg: "bg-red-50 text-red-700 border-red-200", text: "text-red-700", border: "border-red-200" },
  HIGH:     { bg: "bg-orange-50 text-orange-700 border-orange-200", text: "text-orange-700", border: "border-orange-200" },
  MEDIUM:   { bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", border: "border-blue-200" }
};

// ── KPI Card Component ────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color, detail
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; detail?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="text-sm font-semibold text-muted-foreground mt-1">{label}</div>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105", color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-muted/50">
        <span className="text-xs text-muted-foreground font-medium">{sub}</span>
        {detail && <span className="text-xs font-semibold text-primary">{detail}</span>}
      </div>
    </div>
  );
}

// ── Section Card Component ───────────────────────────────────────────────────
function ReportCard({ title, subtitle, children, actions }: {
  title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

export default function TaskReportsPage() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedPartner, setSelectedPartner] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedFY, setSelectedFY] = useState("2026-27");

  // Nudge / Review Interactive States
  const [nudgedTaskId, setNudgedTaskId] = useState<string | null>(null);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [nudgeSuccessMessage, setNudgeSuccessMessage] = useState("");

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  // ── TRIGGER NUDGE ──────────────────────────────────────────────────────────
  const handleTriggerNudge = (task: any) => {
    setNudgedTaskId(task.id);
    setNudgeSuccessMessage(`Nudge alert dispatched! ${task.assignedTo?.name || 'Assignee'} has been sent a High-priority SMS & Slack reminder for task: "${task.title}".`);
    
    setTimeout(() => {
      setNudgedTaskId(null);
      setNudgeSuccessMessage("");
    }, 3000);
  };

  // ── CONFIRM REVIEW APPROVAL ─────────────────────────────────────────────────
  const handleApproveReview = (status: "COMPLETED" | "REQUEST_CHANGES") => {
    setReviewSuccess(true);
    setTimeout(() => {
      setReviewSuccess(false);
      setReviewTask(null);
      // Update UI counts dynamically
      if (status === "COMPLETED") {
        setStats((prev: any) => ({
          ...prev,
          completed: prev.completed + 1,
          sentForReview: Math.max(0, prev.sentForReview - 1),
          // Remove from stuck in review
          stuckInReview: prev.stuckInReview.filter((t: any) => t.id !== reviewTask.id)
        }));
      } else {
        setStats((prev: any) => ({
          ...prev,
          requestChanges: prev.requestChanges + 1,
          sentForReview: Math.max(0, prev.sentForReview - 1),
          // Update stuck status
          stuckInReview: prev.stuckInReview.map((t: any) => t.id === reviewTask.id ? { ...t, status: 'Changes Requested' } : t)
        }));
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground space-y-3">
        <Activity className="w-10 h-10 animate-spin text-primary" />
        <span className="text-sm font-medium">Aggregating compliance trackers & calculating workloads...</span>
      </div>
    );
  }

  const statusData = [
    { name: "Pending", value: stats.pending || 0, color: "#3b82f6" }, // blue-500
    { name: "In Progress", value: stats.inProgress || 0, color: "#f59e0b" }, // amber-500
    { name: "Sent for Review", value: stats.sentForReview || 0, color: "#0ea5e9" }, // sky-500
    { name: "Request Changes", value: stats.requestChanges || 0, color: "#8b5cf6" }, // purple-500
    { name: "Overdue", value: stats.overdue || 0, color: "#ef4444" }, // red-500
    { name: "Completed", value: stats.completed || 0, color: "#10b981" }, // emerald-500
    { name: "Cancelled", value: stats.cancelled || 0, color: "#64748b" }, // slate-500
  ].filter(d => d.value > 0);

  const categoryData = stats.tasksByCategory || [];
  const deptData = stats.tasksByDepartment || [];
  const assigneeData = stats.tasksByAssignee || [];
  const tatData = stats.tatByCategory || [];

  return (
    <div className="space-y-6 pb-12 print:space-y-4 print:pb-0">

      {/* ── HEADER & FILTERS ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task & Productivity Intelligence</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor turnaround times (TAT), workload balance heatmaps, review pipeline delays, and statutory deadline risks.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchStats()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border rounded-lg hover:bg-muted/50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {/* ── TOP FILTER BAR ────────────────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase shrink-0">
          <Filter className="w-4 h-4 text-primary" />
          <span>Quick Filters:</span>
        </div>
        <div className="flex flex-wrap gap-3 items-center flex-1">
          {/* Partner in Charge Dropdown */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="text-xs bg-background border rounded-lg p-2 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Partner: All Partners</option>
              <option value="partner-1">Ramanand (Senior)</option>
              <option value="partner-2">S. K. Joshi (Branch A)</option>
              <option value="partner-3">Anjali Sharma (Tax Div)</option>
            </select>
          </div>

          {/* Specific Client Group Dropdown */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="text-xs bg-background border rounded-lg p-2 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Umbrella: All Client Groups</option>
              <option value="grp-1">Umbrella: Swastik Group</option>
              <option value="grp-2">Umbrella: Apex Exports</option>
              <option value="grp-3">Umbrella: Vardhaman Jewels</option>
            </select>
          </div>

          {/* FY Dropdown */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="text-xs bg-background border rounded-lg p-2 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="2026-27">FY 2026 - 27 (Current)</option>
              <option value="2025-26">FY 2025 - 26</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── STATUTORY COMPLIANCE DEADLINE COUNTDOWN BANNER ────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Statutory Compliance Countdown (May - June 2026)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.statutoryDeadlines?.map((dl: any) => {
            const colors = SEVERITY_COLORS[dl.severity] || SEVERITY_COLORS.MEDIUM;
            return (
              <div
                key={dl.id}
                className={cn(
                  "border rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden bg-card",
                  colors.border
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border shrink-0",
                      colors.bg
                    )}>
                      {dl.severity}
                    </span>
                    <h4 className="text-sm font-bold tracking-tight text-foreground pt-1.5">{dl.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground">{dl.daysRemaining}</div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase">Days Left</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-muted/50 text-xs">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <BellRing className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span>{dl.pendingTasks} tasks pending</span>
                  </span>
                  <span className="text-muted-foreground text-[11px]">Due: {new Date(dl.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MACRO-STATS ROW ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          label="Total Active Tasks"
          value={stats.pending + stats.inProgress + stats.sentForReview + stats.requestChanges + stats.overdue}
          sub="Uncompleted tasks in pipeline"
          icon={Layers}
          color="bg-indigo-100 text-indigo-700"
          detail="Active Workflow"
        />
        <KpiCard
          label="Overdue Tasks (Alerts)"
          value={stats.overdue}
          sub="Past statutory or internal due date"
          icon={AlertCircle}
          color="bg-red-100 text-red-700"
          detail="Immediate Action"
        />
        <KpiCard
          label="Stuck in Review (>48h)"
          value={stats.stuckInReview?.length || 0}
          sub="Awaiting senior sign-off/correction"
          icon={Clock}
          color="bg-amber-100 text-amber-700"
          detail="Bottlenecks"
        />
        <KpiCard
          label="Overall Firm TAT"
          value={`${stats.overallTAT} Days`}
          sub="Average completion days per task"
          icon={Activity}
          color="bg-emerald-100 text-emerald-700"
          detail="Target SLA: 5 Days"
        />
      </div>

      {/* ── ROW 2: STATUS OVERVIEW & TAT LEADERBOARD ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Status pie and overview bar charts combined */}
        <ReportCard
          title="Firm Task Status Distribution"
          subtitle="Current volume breakdown of direct compliance filings & workflows"
        >
          <div className="h-[280px] flex items-center justify-between pt-2">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5 pl-6">
              {statusData.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 text-muted-foreground font-semibold capitalize">
                    {s.name}
                  </span>
                  <span className="font-bold text-foreground text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ReportCard>

        {/* Turnaround Time (TAT) Leaderboard */}
        <ReportCard
          title="Turnaround Time (TAT) by Category"
          subtitle="Average completion days vs. targeted firm SLAs (Target: 5 Days)"
        >
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tatData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fontWeight: 500 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: 'Days Taken', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip
                  formatter={(v: any) => [`${v} Days`, "Avg Completion Time"]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="avgDays" name="Turnaround Time (Days)" fill={COLORS.purple} radius={[4, 4, 0, 0]}>
                  {tatData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.avgDays > 6 ? COLORS.red : entry.avgDays > 4 ? COLORS.orange : COLORS.green} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

      </div>

      {/* ── ROW 3: INTERACTIVE ACTION ITEMS (OVERDUE & STUCK WIDGETS) ───── */}
      
      {nudgeSuccessMessage && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-250 shrink-0">
          <Check className="w-4 h-4 text-emerald-600 bg-white rounded-full p-0.5" />
          <span>{nudgeSuccessMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Overdue tasks list */}
        <ReportCard
          title="Overdue Compliance Files"
          subtitle="Tasks past their deadline requiring immediate partner nudges"
        >
          <div className="overflow-y-auto max-h-[260px] pr-1 space-y-3">
            {stats.overdueTasksList?.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between border border-red-200 p-3 rounded-lg hover:bg-red-50/5 transition-all bg-card">
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="text-sm font-bold truncate text-foreground">{task.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold">
                    <span className="truncate max-w-[140px]">{task.client?.companyName}</span>
                    <span>•</span>
                    <span className="text-red-600 font-bold">Overdue: {format(new Date(task.dueDate), "dd MMM")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">{task.assignedTo?.name}</span>
                  <button
                    onClick={() => handleTriggerNudge(task)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors shadow-sm flex items-center gap-1",
                      nudgedTaskId === task.id 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    )}
                  >
                    <Send className="w-3 h-3" />
                    <span>{nudgedTaskId === task.id ? "Nudged!" : "Nudge"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ReportCard>

        {/* Stuck in review aging */}
        <ReportCard
          title="Stuck in Review Queue (>48 Hours)"
          subtitle="Files awaiting Manager/Partner sign-off — unblock to finalize uploads"
        >
          <div className="overflow-y-auto max-h-[260px] pr-1 space-y-3">
            {stats.stuckInReview?.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between border border-amber-200 p-3 rounded-lg hover:bg-amber-50/5 transition-all bg-card">
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="text-sm font-bold truncate text-foreground">{task.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold">
                    <span className="truncate max-w-[140px]">{task.client}</span>
                    <span>•</span>
                    <span className="text-amber-600 font-bold">Stuck for {task.stuckHours} hrs</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">{task.assignee}</span>
                  <button
                    onClick={() => setReviewTask(task)}
                    className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Review</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ReportCard>

      </div>

      {/* ── ROW 4: LONG-TERM RESOURCE CAPACITY & DEPARTMENTS ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department load breakdown */}
        <ReportCard
          title="Department Operational Load"
          subtitle="Filing tasks active and completed across compliance categories"
        >
          <div className="h-[250px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="department" type="category" width={110} tick={{ fontSize: 11, fontWeight: 500 }} />
                <Tooltip
                  formatter={(v: any) => [`${v} Tasks`, "Task Load"]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]}>
                  {deptData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

        {/* Team Capacity stack horizontal */}
        <ReportCard
          title="Team Workload Capacity Heatmap"
          subtitle="Active files balanced against completed filings per team member"
        >
          <div className="h-[250px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={assigneeData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fontWeight: 500 }} />
                <Tooltip
                  formatter={(v: any) => [`${v} Tasks`]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="active" name="Active Files" stackId="a" fill={COLORS.orange} />
                <Bar dataKey="completed" name="Completed Files" stackId="a" fill={COLORS.green} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

      </div>

      {/* ── ROW 5: COMPLIANCE DUE THIS WEEK TABLE ────────────────────────── */}
      <ReportCard
        title="Weekly Compliance Filing Schedule"
        subtitle="List of direct customer filings scheduled to hit compliance targets this week"
      >
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-3 font-semibold">Filing Task</th>
                <th className="px-4 py-3 font-semibold">Client Company</th>
                <th className="px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Statutory Target</th>
                <th className="px-4 py-3 font-semibold">Current State</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.dueThisWeek?.map((task: any) => (
                <tr key={task.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <Link href={`/tasks/list`} className="hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.client?.companyName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{task.assignedTo?.name || 'Unassigned'}</td>
                  <td className="px-4 py-3 font-semibold">
                    {task.dueDate ? format(new Date(task.dueDate), "MMM dd, yyyy") : "No target date"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                      task.status === 'IN_PROGRESS' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      task.status === 'SENT_FOR_REVIEW' ? "bg-sky-50 text-sky-700 border-sky-200" :
                      task.status === 'REQUEST_CHANGES' ? "bg-purple-50 text-purple-700 border-purple-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>

      {/* ── MODALS & ACCELERATOR DRAWERS ──────────────────────────────────── */}
      
      {/* Stuck Task review modal */}
      {reviewTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-sky-50 border border-sky-200 text-sky-700">
                    Review Panel
                  </span>
                  <h3 className="text-lg font-bold tracking-tight mt-1.5">{reviewTask.title}</h3>
                </div>
                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-0.5 border border-amber-100 rounded-full shrink-0">
                  Stuck {reviewTask.stuckHours} hrs
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="border rounded-xl p-4 bg-muted/20 space-y-2 text-xs">
                <h4 className="font-bold text-muted-foreground uppercase pb-1 border-b">Audit Checklist Details</h4>
                <div className="grid grid-cols-2 gap-3 pt-1 font-semibold text-foreground">
                  <div><span className="text-muted-foreground">Client:</span> {reviewTask.client}</div>
                  <div><span className="text-muted-foreground">Assignee:</span> {reviewTask.assignee}</div>
                  <div><span className="text-muted-foreground">Status:</span> {reviewTask.status}</div>
                  <div><span className="text-muted-foreground">Target Date:</span> May 31, 2026</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-muted-foreground uppercase">Articleship Checklist Sub-items</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border p-2.5 rounded-lg bg-card font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="line-through text-muted-foreground">Verify MCA Portal director credentials (KYC checks)</span>
                  </div>
                  <div className="flex items-center gap-2 border p-2.5 rounded-lg bg-card font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="line-through text-muted-foreground">Compute GSTR-1 matching vs sales registers</span>
                  </div>
                  <div className="flex items-center gap-2 border p-2.5 rounded-lg bg-card font-semibold">
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                    <span className="text-foreground">Approve final PDF balance sheet signature upload</span>
                  </div>
                </div>
              </div>

              {/* Success Notification */}
              {reviewSuccess && (
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 bg-white rounded-full p-0.5" />
                  <span>Task audited! Action Center updated successfully.</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-muted/40 border-t flex justify-between gap-2">
              <button
                onClick={() => setReviewTask(null)}
                disabled={reviewSuccess}
                className="px-4 py-2 text-xs font-bold border hover:bg-muted bg-card rounded-lg transition-colors"
              >
                Cancel
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveReview("REQUEST_CHANGES")}
                  disabled={reviewSuccess}
                  className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Request Changes</span>
                </button>
                <button
                  onClick={() => handleApproveReview("COMPLETED")}
                  disabled={reviewSuccess}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-green-600/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Sign-off</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}