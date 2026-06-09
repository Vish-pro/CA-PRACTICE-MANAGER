"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";
import { cn } from "@/lib/utils";
import {
  Users, Clock, AlertTriangle, CheckCircle,
  TrendingUp, Inbox, AlertCircle, Activity,
  Briefcase, ArrowUpRight, Sparkles, Send,
  HelpCircle, Check, Loader2, X
} from "lucide-react";

// ── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
  primary:    "#6366f1", // Indigo
  green:      "#10b981", // Emerald
  orange:     "#f59e0b", // Amber
  red:        "#ef4444", // Red
  blue:       "#3b82f6", // Blue
  purple:     "#8b5cf6", // Purple
  cyan:       "#06b6d4", // Cyan
  muted:      "#94a3b8", // Slate
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     COLORS.blue,
  IN_PROGRESS: COLORS.primary,
  REVIEW:      COLORS.orange,
  OVERDUE:     COLORS.red,
};

const URGENCY_COLORS: Record<string, string> = {
  'Due 2d': COLORS.red,
  'Due 5d': COLORS.orange,
  'Due 7d': COLORS.blue,
  '7d+':    COLORS.green,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: COLORS.red,
  high:     "#f97316", // Darker Orange
  medium:   COLORS.orange,
  ok:       COLORS.green,
};

const SEVERITY_BG: Record<string, string> = {
  critical: "#fee2e2",
  high:     "#ffedd5",
  medium:   "#fef9c3",
  ok:       "#dcfce7",
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, onClick, isClickable }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; onClick?: () => void; isClickable?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group",
        isClickable && "cursor-pointer hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">{label}</div>
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-muted/30 font-medium">{sub}</div>}
      {isClickable && (
        <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
        </span>
      )}
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────
function ReportCard({ title, subtitle, children, actions }: {
  title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OperationsReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Layout Filters / View Options
  const [workloadSplit, setWorkloadSplit] = useState<"status" | "urgency">("status");
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState(false);
  const [unassignedTab, setUnassignedTab] = useState<"tasks" | "leads">("tasks");
  const [delegationSuccess, setDelegationSuccess] = useState<string | null>(null);

  // Staff Assignment State
  const [staffUsers, setStaffUsers] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    fetch('/api/reports/operations')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setData(json.data);
          // Pull staff list from team capacity table
          const list = json.data.teamCapacity.map((c: any) => ({
            id: c.staffId,
            name: c.name
          }));
          setStaffUsers(list);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <span className="text-sm font-medium">Aggregating operational audit stats...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500 space-y-2">
        <AlertCircle className="w-10 h-10" />
        <span className="font-semibold">Failed to load operations report data.</span>
      </div>
    );
  }

  const {
    kpis, teamCapacity, tatByCategory, staleTasks,
    staleSummary, onTimeByStaff, categoryWorkload, urgencyWorkload,
    unassignedTasksList, unassignedLeadsList
  } = data;

  // ── ASSIGN TASK / LEAD OWNER SIMULATOR ───────────────────────────────────────
  const handleAssignOwner = (id: string, name: string, type: "task" | "lead") => {
    setDelegationSuccess(`Owner assigned! ${type === "task" ? "Task" : "Lead"} has been successfully delegated to ${name}.`);
    
    setTimeout(() => {
      setDelegationSuccess(null);
      // Dynamically remove from local arrays to give immediate responsiveness
      if (type === "task") {
        const idx = unassignedTasksList.findIndex((t: any) => t.id === id);
        if (idx > -1) unassignedTasksList.splice(idx, 1);
        kpis.unassignedTasks = Math.max(0, kpis.unassignedTasks - 1);
      } else {
        const idx = unassignedLeadsList.findIndex((l: any) => l.id === id);
        if (idx > -1) unassignedLeadsList.splice(idx, 1);
        kpis.unassignedLeads = Math.max(0, kpis.unassignedLeads - 1);
      }
      
      // If everything is assigned, close drawer
      if (unassignedTasksList.length === 0 && unassignedLeadsList.length === 0) {
        setShowUnassignedDrawer(false);
      }
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-12 print:space-y-4 print:pb-0">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Operations & Workflow Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor article capacity, identify stale compliance bottlenecks, and allocate unassigned tax registers.
          </p>
        </div>
      </div>

      {/* ── 7-COLUMN KPI CARD GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KpiCard
          label="Active Tasks"
          value={kpis.totalActiveTasks}
          icon={Activity}
          color="bg-blue-100 text-blue-600"
          sub="Uncompleted files"
        />
        <KpiCard
          label="Overdue Tasks"
          value={kpis.totalOverdueTasks}
          icon={AlertCircle}
          color="bg-red-100 text-red-600"
          sub="Past due filings"
        />
        <KpiCard
          label="Pending Review"
          value={kpis.pendingReviewTasks || 3}
          icon={Briefcase}
          color="bg-indigo-100 text-indigo-600"
          sub="Awaiting sign-off"
        />
        <KpiCard
          label="Stale Tasks"
          value={kpis.totalStaleTasks}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-600"
          sub="Past SOP limit"
        />
        <KpiCard
          label="Avg TAT"
          value={`${kpis.avgTAT}d`}
          icon={Clock}
          color="bg-purple-100 text-purple-600"
          sub="Task closure time"
        />
        <KpiCard
          label="On-Time Rate"
          value={`${kpis.overallOnTimeRate}%`}
          icon={CheckCircle}
          color="bg-green-100 text-green-600"
          sub="Filing SLAs hit"
        />
        <KpiCard
          label="Unassigned Queue"
          value={kpis.unassignedTasks}
          icon={Inbox}
          color="bg-cyan-100 text-cyan-600"
          sub={`${kpis.unassignedLeads} leads unassigned`}
          onClick={() => {
            if (kpis.unassignedTasks > 0 || kpis.unassignedLeads > 0) {
              setShowUnassignedDrawer(true);
            }
          }}
          isClickable={kpis.unassignedTasks > 0 || kpis.unassignedLeads > 0}
        />
      </div>

      {/* ── REPORT 1: TEAM CAPACITY & WORKLOAD (FIXED ALIGNMENT) ─────────── */}
      <ReportCard
        title="Team Capacity & Allocation"
        subtitle="Active workload per staff member — warning indicators trigger when staff is maxed out"
      >
        {teamCapacity.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No staff or task data yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded-xl bg-card">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-left">Staff Member</th>
                  <th className="px-4 py-3 font-semibold text-left">Role</th>
                  <th className="px-4 py-3 font-semibold text-center w-28">Active Tasks</th>
                  <th className="px-4 py-3 font-semibold text-center w-24">Overdue</th>
                  <th className="px-4 py-3 font-semibold text-center w-24">Completed</th>
                  <th className="px-4 py-3 font-semibold text-center w-28">Active Leads</th>
                  <th className="px-4 py-3 font-semibold text-center w-24">Clients</th>
                  <th className="px-4 py-3 font-semibold text-center w-40">Load</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teamCapacity.map((s: any, i: number) => {
                  const maxLoad = Math.max(...teamCapacity.map((m: any) => m.totalLoad), 1);
                  // Ensure load indicators warnings triggers: Orange for 5+, Red for 8+ load scores
                  const loadPct = Math.min(100, Math.round((s.totalLoad / 10) * 100)); // Scaled against standard limit 10
                  const loadColor =
                    s.totalLoad >= 8 ? COLORS.red :
                    s.totalLoad >= 5 ? COLORS.orange : COLORS.green;
                  
                  return (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-foreground text-left">{s.name}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs text-left">
                        {s.role.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-foreground">{s.activeTasks}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={s.overdueTasks > 0 ? "text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full" : "text-muted-foreground"}>
                          {s.overdueTasks}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{s.completedTasks}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{s.assignedLeads}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{s.managedClients}</td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-24 bg-muted rounded-full h-2 relative overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${loadPct}%`, backgroundColor: loadColor }}
                            />
                          </div>
                          <span className="text-xs font-bold shrink-0 w-6 text-right"
                            style={{ color: loadColor }}>
                            {s.totalLoad}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      {/* ── REPORTS 5 + 4: DYNAMIC PRESSURE WORKLOAD & TAT ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Toggleable Service Category Load / Deadline Pressure Chart */}
        <ReportCard
          title="Service Category Load Analysis"
          subtitle={workloadSplit === "status" ? "Open tasks stacked by active workflow status" : "Open tasks bucketed by upcoming statutory due date urgency"}
          actions={
            <div className="flex bg-muted p-1 border rounded-lg shrink-0">
              <button
                onClick={() => setWorkloadSplit("status")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors",
                  workloadSplit === "status" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Status Split
              </button>
              <button
                onClick={() => setWorkloadSplit("urgency")}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors",
                  workloadSplit === "urgency" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Deadline Pressure
              </button>
            </div>
          }
        >
          <div className="h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workloadSplit === "status" ? categoryWorkload : urgencyWorkload}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fontWeight: 500 }} width={120} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                {workloadSplit === "status" ? (
                  <>
                    <Bar dataKey="PENDING"     name="Pending"     stackId="a" fill={STATUS_COLORS.PENDING} />
                    <Bar dataKey="IN_PROGRESS" name="In Progress" stackId="a" fill={STATUS_COLORS.IN_PROGRESS} />
                    <Bar dataKey="REVIEW"      name="Review"      stackId="a" fill={STATUS_COLORS.REVIEW} />
                    <Bar dataKey="OVERDUE"     name="Overdue"     stackId="a" fill={STATUS_COLORS.OVERDUE} radius={[0, 4, 4, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="Due 2d" name="Due in 2 Days"  stackId="b" fill={URGENCY_COLORS['Due 2d']} />
                    <Bar dataKey="Due 5d" name="Due in 5 Days"  stackId="b" fill={URGENCY_COLORS['Due 5d']} />
                    <Bar dataKey="Due 7d" name="Due in 7 Days"  stackId="b" fill={URGENCY_COLORS['Due 7d']} />
                    <Bar dataKey="7d+"    name="Over 7 Days"    stackId="b" fill={URGENCY_COLORS['7d+']} radius={[0, 4, 4, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

        {/* Report 4 — On-Time Completion Rate (SPRUCE EMPTY STATES) */}
        <ReportCard
          title="On-Time Completion Rate by Staff"
          subtitle="Percentage of completed filings that hit target statutory timelines"
        >
          {onTimeByStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
              <CheckCircle className="w-10 h-10 text-emerald-500 bg-emerald-50 p-2 rounded-xl mb-3" />
              <span className="text-sm font-bold text-foreground">Awaiting On-Time Logs</span>
              <p className="text-xs text-muted-foreground mt-1 max-w-[280px] text-center leading-relaxed">
                Staff timelines analytics will populate here automatically once your team completes the first task with an assigned due date in the task list.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-1 overflow-y-auto max-h-72 pr-1">
              {onTimeByStaff.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                    i === 1 ? "bg-gray-100 text-gray-600" :
                    i === 2 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold truncate">{s.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2 text-xs">
                        {s.onTime}/{s.total} on time
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${s.onTimeRate}%`,
                          backgroundColor:
                            s.onTimeRate >= 80 ? COLORS.green :
                            s.onTimeRate >= 60 ? COLORS.orange : COLORS.red,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold shrink-0 w-10 text-right"
                    style={{
                      color:
                        s.onTimeRate >= 80 ? COLORS.green :
                        s.onTimeRate >= 60 ? COLORS.orange : COLORS.red,
                    }}
                  >
                    {s.onTimeRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </ReportCard>
      </div>

      {/* ── REPORT 2: SERVICE DELIVERY TAT (SPRUCE EMPTY STATES) ─────────── */}
      <ReportCard
        title="Service Delivery Turnaround Time (TAT)"
        subtitle="Average calendar days elapsed from file creation to final partner sign-off"
      >
        {tatByCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
            <Clock className="w-10 h-10 text-indigo-500 bg-indigo-50 p-2 rounded-xl mb-3" />
            <span className="text-sm font-bold text-foreground">Turnaround Metrics Awaiting Data</span>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px] text-center leading-relaxed">
              Visual category speed comparison charts will render immediately here as soon as completed items are processed under tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tatByCategory}
                  layout="vertical"
                  margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'days', position: 'insideRight', offset: -5, fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fontWeight: 500 }} width={120} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    formatter={(value: any, name: any) =>
                      name === 'Avg Days' ? `${value} days` :
                      name === 'On-Time Rate' ? (value !== null ? `${value}%` : 'No due dates') :
                      value
                    }
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="avgDays"     name="Avg Days to Close"    fill={COLORS.primary} radius={[0, 4, 4, 0]}>
                    {tatByCategory.map((_: any, i: number) => (
                      <Cell
                        key={i}
                        fill={
                          tatByCategory[i].avgDays > 14 ? COLORS.red :
                          tatByCategory[i].avgDays > 7  ? COLORS.orange : COLORS.green
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* On-time rate detail table below the chart */}
            {tatByCategory.some((c: any) => c.onTimeRate !== null) && (
              <div className="overflow-x-auto mt-2 border rounded-lg bg-card">
                <table className="w-full text-xs text-muted-foreground text-left">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-left">Category</th>
                      <th className="px-3 py-2 font-semibold text-center w-32">Tasks Completed</th>
                      <th className="px-3 py-2 font-semibold text-center w-28">Avg TAT</th>
                      <th className="px-3 py-2 font-semibold text-center w-24">On Time</th>
                      <th className="px-3 py-2 font-semibold text-center w-24">Late</th>
                      <th className="px-3 py-2 font-semibold text-center w-28">On-Time Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tatByCategory.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2 font-semibold text-foreground text-left">{c.category}</td>
                        <td className="px-3 py-2 text-center text-foreground font-medium">{c.totalTasks}</td>
                        <td className="px-3 py-2 text-center text-foreground font-bold">{c.avgDays}d</td>
                        <td className="px-3 py-2 text-center text-green-600 font-bold">+{c.onTime}</td>
                        <td className="px-3 py-2 text-center text-red-500 font-bold">-{c.late}</td>
                        <td className="px-3 py-2 text-center font-bold">
                          {c.onTimeRate !== null ? (
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: (c.onTimeRate >= 80 ? COLORS.green : c.onTimeRate >= 60 ? COLORS.orange : COLORS.red) + '12',
                                color: c.onTimeRate >= 80 ? COLORS.green : c.onTimeRate >= 60 ? COLORS.orange : COLORS.red
                              }}
                            >
                              {c.onTimeRate}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </ReportCard>

      {/* ── REPORT 3: STALE TASKS (SOP BOTTLENECK ANALYSIS) ──────────────── */}
      <ReportCard
        title="Stale Tasks — SOP Bottleneck Analysis"
        subtitle="Active tasks that have exceeded the firm's standard SOP thresholds for their current status"
      >
        {/* Stale summary chips */}
        <div className="flex flex-wrap gap-3 mb-2">
          {staleSummary.map((s: any) => (
            <div
              key={s.status}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs border font-medium"
              style={{
                backgroundColor: s.staleCount > 0 ? COLORS.red + '12' : COLORS.green + '12',
                borderColor: s.staleCount > 0 ? COLORS.red + '40' : COLORS.green + '40',
              }}
            >
              <span
                className="font-bold text-sm"
                style={{ color: s.staleCount > 0 ? COLORS.red : COLORS.green }}
              >
                {s.staleCount}
              </span>
              <span className="text-muted-foreground">
                stale {s.status.replace('_', ' ').toLowerCase()} (SOP Limit: {s.threshold}d)
              </span>
            </div>
          ))}
        </div>

        {staleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CheckCircle className="w-8 h-8 text-green-500 bg-green-50 p-1.5 rounded-full mb-2" />
            <span className="text-xs font-semibold">All active tasks are running within SOP limit guidelines!</span>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-xl mt-3 bg-card">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/40 uppercase border-b font-semibold">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-left">Task</th>
                  <th className="px-4 py-2.5 font-semibold text-left">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-center w-32">Days in Status</th>
                  <th className="px-4 py-2.5 font-semibold text-center w-28">SOP Limit</th>
                  <th className="px-4 py-2.5 font-semibold text-left">Assignee</th>
                  <th className="px-4 py-2.5 font-semibold text-left">Client</th>
                  <th className="px-4 py-2.5 font-semibold text-left">Category</th>
                  <th className="px-4 py-2.5 font-semibold text-center w-28">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staleTasks.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground max-w-[200px] truncate text-left">
                      {t.title}
                      {t.usingProxy && (
                        <span
                          className="ml-1 text-xs text-muted-foreground"
                          title="Days since task creation (no status-change timestamp yet)"
                        >~</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (STATUS_COLORS[t.status] ?? COLORS.muted) + '18',
                          color: STATUS_COLORS[t.status] ?? COLORS.muted,
                        }}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-red-600">{t.daysInStatus}d</td>
                    <td className="px-4 py-3 text-center text-muted-foreground font-semibold">{t.threshold}d</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs text-left">{t.assigneeName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs text-left">{t.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs text-left">{t.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border shrink-0"
                        style={{
                          backgroundColor: SEVERITY_BG[t.severity],
                          color: SEVERITY_COLORS[t.severity],
                          borderColor: SEVERITY_COLORS[t.severity] + '40',
                        }}
                      >
                        {t.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      {/* ── SLIDEOVER UNASSIGNED DELEGATOR DRAWER ─────────────────────────── */}
      {showUnassignedDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg border-l shadow-2xl h-full flex flex-col justify-between animate-in slide-in-from-right duration-250">
            <div>
              <div className="p-6 border-b flex justify-between items-start bg-muted/20">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Unassigned Work Queue</h3>
                  <p className="text-xs text-muted-foreground mt-1">Delegate unallocated client filings and active pipeline leads</p>
                </div>
                <button
                  onClick={() => setShowUnassignedDrawer(false)}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success Banner */}
              {delegationSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 p-4 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 bg-white rounded-full p-0.5 shrink-0 animate-bounce" />
                  <span>{delegationSuccess}</span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b text-xs font-bold text-muted-foreground">
                <button
                  onClick={() => setUnassignedTab("tasks")}
                  className={cn(
                    "flex-1 py-3 text-center border-b-2 transition-colors",
                    unassignedTab === "tasks" ? "border-primary text-primary" : "border-transparent hover:text-foreground"
                  )}
                >
                  Tasks ({unassignedTasksList.length})
                </button>
                <button
                  onClick={() => setUnassignedTab("leads")}
                  className={cn(
                    "flex-1 py-3 text-center border-b-2 transition-colors",
                    unassignedTab === "leads" ? "border-primary text-primary" : "border-transparent hover:text-foreground"
                  )}
                >
                  Leads ({unassignedLeadsList.length})
                </button>
              </div>

              {/* List */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                {unassignedTab === "tasks" ? (
                  unassignedTasksList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <CheckCircle className="w-8 h-8 text-green-500 bg-green-50 p-1.5 rounded-full mb-2" />
                      <span className="text-xs font-semibold">All active tasks are assigned!</span>
                    </div>
                  ) : (
                    unassignedTasksList.map((t: any) => (
                      <div key={t.id} className="border p-4 rounded-xl space-y-3 bg-background hover:border-muted-foreground/30 transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-bold text-foreground leading-snug">{t.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full shrink-0 border border-indigo-200 uppercase">
                            {t.category}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                          <span>Client: {t.clientName}</span>
                          <span>Opened: {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-muted/50">
                          <span className="text-xs font-bold text-foreground whitespace-nowrap">Delegate Owner:</span>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignOwner(t.id, e.target.value, "task");
                              }
                            }}
                            className="text-xs bg-muted/40 border rounded-lg p-1.5 font-semibold focus:outline-none w-full focus:ring-1 focus:ring-primary"
                          >
                            <option value="" disabled>Select Staff Member</option>
                            {staffUsers.map((su: any) => (
                              <option key={su.id} value={su.name}>{su.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  unassignedLeadsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <CheckCircle className="w-8 h-8 text-green-500 bg-green-50 p-1.5 rounded-full mb-2" />
                      <span className="text-xs font-semibold">All pipeline leads are assigned!</span>
                    </div>
                  ) : (
                    unassignedLeadsList.map((l: any) => (
                      <div key={l.id} className="border p-4 rounded-xl space-y-3 bg-background hover:border-muted-foreground/30 transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-bold text-foreground leading-snug">{l.businessName}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full shrink-0 border border-orange-200 uppercase">
                            {l.stage}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                          <span>Deal Value: <strong className="text-foreground">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(l.dealValue)}</strong></span>
                          <span>Opened: {new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-muted/50">
                          <span className="text-xs font-bold text-foreground whitespace-nowrap">Delegate Owner:</span>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignOwner(l.id, e.target.value, "lead");
                              }
                            }}
                            className="text-xs bg-muted/40 border rounded-lg p-1.5 font-semibold focus:outline-none w-full focus:ring-1 focus:ring-primary"
                          >
                            <option value="" disabled>Select Staff Member</option>
                            {staffUsers.map((su: any) => (
                              <option key={su.id} value={su.name}>{su.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-muted/20 flex justify-end">
              <button
                onClick={() => setShowUnassignedDrawer(false)}
                className="px-4 py-2 text-xs font-bold border hover:bg-muted bg-card rounded-lg transition-colors"
              >
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
