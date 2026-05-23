"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";
import { cn } from "@/lib/utils";
import {
  Users, Clock, AlertTriangle, CheckCircle,
  TrendingUp, Inbox, AlertCircle, Activity
} from "lucide-react";

// ── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
  primary:    "#6366f1",
  green:      "#22c55e",
  orange:     "#f59e0b",
  red:        "#ef4444",
  blue:       "#3b82f6",
  purple:     "#a855f7",
  cyan:       "#06b6d4",
  muted:      "#94a3b8",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     COLORS.blue,
  IN_PROGRESS: COLORS.primary,
  REVIEW:      COLORS.orange,
  OVERDUE:     COLORS.red,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: COLORS.red,
  high:     "#f97316",
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
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-start justify-between">
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</div>}
      </div>
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────
function ReportCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OperationsReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/operations')
      .then(r => r.json())
      .then(json => { if (json.data) setData(json.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        Loading operations report data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        Failed to load operations report data.
      </div>
    );
  }

  const {
    kpis, teamCapacity, tatByCategory, staleTasks,
    staleSummary, onTimeByStaff, categoryWorkload,
  } = data;

  return (
    <div className="space-y-6 pb-10">

      {/* ── KPI BAR ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Active Tasks"      value={kpis.totalActiveTasks}   icon={Activity}      color="bg-blue-100 text-blue-600" />
        <KpiCard label="Overdue Tasks"     value={kpis.totalOverdueTasks}  icon={AlertCircle}   color="bg-red-100 text-red-600" />
        <KpiCard label="Stale Tasks"       value={kpis.totalStaleTasks}    icon={AlertTriangle} color="bg-orange-100 text-orange-600" sub="past SOP threshold" />
        <KpiCard label="Avg TAT"           value={`${kpis.avgTAT}d`}       icon={Clock}         color="bg-purple-100 text-purple-600" sub="to complete a task" />
        <KpiCard label="On-Time Rate"      value={`${kpis.overallOnTimeRate}%`} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <KpiCard label="Unassigned"        value={kpis.unassignedTasks}    icon={Inbox}         color="bg-cyan-100 text-cyan-600" sub={`${kpis.unassignedLeads} leads too`} />
      </div>

      {/* ── REPORT 1: TEAM CAPACITY ───────────────────────────────────────── */}
      <ReportCard
        title="Team Capacity & Allocation"
        subtitle="Active workload per staff member — tasks, leads, and managed clients"
      >
        {teamCapacity.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No staff or task data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 font-medium">Staff Member</th>
                  <th className="text-left py-2 font-medium">Role</th>
                  <th className="text-right py-2 font-medium">Active Tasks</th>
                  <th className="text-right py-2 font-medium">Overdue</th>
                  <th className="text-right py-2 font-medium">Completed</th>
                  <th className="text-right py-2 font-medium">Active Leads</th>
                  <th className="text-right py-2 font-medium">Clients</th>
                  <th className="py-2 font-medium w-32">Load</th>
                </tr>
              </thead>
              <tbody>
                {teamCapacity.map((s: any, i: number) => {
                  const maxLoad = Math.max(...teamCapacity.map((m: any) => m.totalLoad), 1);
                  const loadPct = Math.round((s.totalLoad / maxLoad) * 100);
                  const loadColor =
                    loadPct > 75 ? COLORS.red :
                    loadPct > 50 ? COLORS.orange : COLORS.green;
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {s.role.replace('_', ' ')}
                      </td>
                      <td className="py-3 text-right font-semibold">{s.activeTasks}</td>
                      <td className="py-3 text-right">
                        <span className={s.overdueTasks > 0 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                          {s.overdueTasks}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">{s.completedTasks}</td>
                      <td className="py-3 text-right text-muted-foreground">{s.assignedLeads}</td>
                      <td className="py-3 text-right text-muted-foreground">{s.managedClients}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${loadPct}%`, backgroundColor: loadColor }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right"
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

      {/* ── REPORTS 5 + 4: CATEGORY WORKLOAD + ON-TIME RATE ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Report 5 — Service Category Workload */}
        <ReportCard
          title="Service Category Workload"
          subtitle="Open tasks stacked by status per service category"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryWorkload}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend iconSize={10} />
                <Bar dataKey="PENDING"     name="Pending"     stackId="a" fill={STATUS_COLORS.PENDING}     radius={[0, 0, 0, 0]} />
                <Bar dataKey="IN_PROGRESS" name="In Progress" stackId="a" fill={STATUS_COLORS.IN_PROGRESS} radius={[0, 0, 0, 0]} />
                <Bar dataKey="REVIEW"      name="Review"      stackId="a" fill={STATUS_COLORS.REVIEW}      radius={[0, 0, 0, 0]} />
                <Bar dataKey="OVERDUE"     name="Overdue"     stackId="a" fill={STATUS_COLORS.OVERDUE}     radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {categoryWorkload.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-6">No open tasks yet.</p>
          )}
        </ReportCard>

        {/* Report 4 — On-Time Completion Rate */}
        <ReportCard
          title="On-Time Completion Rate by Staff"
          subtitle="Of completed tasks with a due date — % finished on time"
        >
          {onTimeByStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              No completed tasks with due dates yet.
            </p>
          ) : (
            <div className="space-y-4 pt-1 overflow-y-auto max-h-72">
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
                      <span className="font-medium truncate">{s.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2 text-xs">
                        {s.onTime}/{s.total} on time
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
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

      {/* ── REPORT 2: SERVICE DELIVERY TAT ───────────────────────────────── */}
      <ReportCard
        title="Service Delivery Turnaround Time (TAT)"
        subtitle="Average days from task creation to completion — by service category"
      >
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
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                formatter={(value: any, name: any) =>
                  name === 'Avg Days' ? `${value} days` :
                  name === 'On-Time Rate' ? (value !== null ? `${value}%` : 'No due dates') :
                  value
                }
              />
              <Legend iconSize={10} />
              <Bar dataKey="avgDays"     name="Avg Days"    fill={COLORS.primary} radius={[0, 4, 4, 0]}>
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
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs text-muted-foreground">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 font-medium">Category</th>
                  <th className="text-right py-1 font-medium">Tasks Completed</th>
                  <th className="text-right py-1 font-medium">Avg TAT</th>
                  <th className="text-right py-1 font-medium">On Time</th>
                  <th className="text-right py-1 font-medium">Late</th>
                  <th className="text-right py-1 font-medium">On-Time Rate</th>
                </tr>
              </thead>
              <tbody>
                {tatByCategory.map((c: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium text-foreground">{c.category}</td>
                    <td className="py-2 text-right">{c.totalTasks}</td>
                    <td className="py-2 text-right">{c.avgDays}d</td>
                    <td className="py-2 text-right text-green-600 font-semibold">{c.onTime}</td>
                    <td className="py-2 text-right text-red-500 font-semibold">{c.late}</td>
                    <td className="py-2 text-right font-bold">
                      {c.onTimeRate !== null ? (
                        <span style={{
                          color: c.onTimeRate >= 80 ? COLORS.green :
                                 c.onTimeRate >= 60 ? COLORS.orange : COLORS.red
                        }}>
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
        {tatByCategory.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-6">No completed tasks yet.</p>
        )}
      </ReportCard>

      {/* ── REPORT 3: STALE TASKS ────────────────────────────────────────── */}
      <ReportCard
        title="Stale Tasks — Bottleneck Analysis"
        subtitle="Active tasks that have exceeded the firm's SOP threshold for their current status"
      >
        {/* Stale summary chips */}
        <div className="flex flex-wrap gap-3 mb-2">
          {staleSummary.map((s: any) => (
            <div
              key={s.status}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm border"
              style={{
                backgroundColor: s.staleCount > 0 ? COLORS.red + '12' : COLORS.green + '12',
                borderColor: s.staleCount > 0 ? COLORS.red + '40' : COLORS.green + '40',
              }}
            >
              <span
                className="font-bold text-base"
                style={{ color: s.staleCount > 0 ? COLORS.red : COLORS.green }}
              >
                {s.staleCount}
              </span>
              <span className="text-muted-foreground">
                stale {s.status.replace('_', ' ').toLowerCase()} (SOP: {s.threshold}d)
              </span>
            </div>
          ))}
        </div>

        {staleTasks.length === 0 ? (
          <p className="text-sm text-green-600 font-medium text-center py-6">
            No stale tasks — all active tasks are within SOP thresholds.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 font-medium">Task</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-right py-2 font-medium">Days in Status</th>
                  <th className="text-right py-2 font-medium">SOP Limit</th>
                  <th className="text-left py-2 font-medium">Assignee</th>
                  <th className="text-left py-2 font-medium">Client</th>
                  <th className="text-left py-2 font-medium">Category</th>
                  <th className="text-center py-2 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {staleTasks.map((t: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium max-w-[200px] truncate">
                      {t.title}
                      {t.usingProxy && (
                        <span
                          className="ml-1 text-xs text-muted-foreground"
                          title="Days since task creation (no status-change timestamp yet)"
                        >~</span>
                      )}
                    </td>
                    <td className="py-3">
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
                    <td className="py-3 text-right font-bold">{t.daysInStatus}d</td>
                    <td className="py-3 text-right text-muted-foreground">{t.threshold}d</td>
                    <td className="py-3 text-muted-foreground">{t.assigneeName}</td>
                    <td className="py-3 text-muted-foreground">{t.clientName}</td>
                    <td className="py-3 text-muted-foreground">{t.category}</td>
                    <td className="py-3 text-center">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{
                          backgroundColor: SEVERITY_BG[t.severity],
                          color: SEVERITY_COLORS[t.severity],
                        }}
                      >
                        {t.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3 italic">
              ~ = days since task creation (status-change tracking not yet available for this task)
            </p>
          </div>
        )}
      </ReportCard>

    </div>
  );
}
