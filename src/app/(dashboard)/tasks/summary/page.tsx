"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";
import { AlertCircle, Clock } from "lucide-react";

export default function TasksSummaryPage() {
  const pathname = usePathname();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

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

  const statusData = [
    { name: "Pending", value: stats.pending || 0, color: "#3b82f6" }, // blue-500
    { name: "In Progress", value: stats.inProgress || 0, color: "#f59e0b" }, // amber-500
    { name: "Sent for Review", value: stats.sentForReview || 0, color: "#0ea5e9" }, // sky-500
    { name: "Request Changes", value: stats.requestChanges || 0, color: "#6366f1" }, // indigo-500
    { name: "Overdue", value: stats.overdue || 0, color: "#ef4444" }, // red-500
    { name: "Completed", value: stats.completed || 0, color: "#22c55e" }, // green-500
    { name: "Cancelled", value: stats.cancelled || 0, color: "#f87171" }, // red-400
  ].filter(d => d.value > 0);

  const categoryData = stats.tasksByCategory || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-border">
        <Link
          href="/tasks/list"
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            pathname === "/tasks/list" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Task List
        </Link>
        <Link
          href="/tasks/summary"
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            pathname === "/tasks/summary" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Task Summary
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Tasks by Status</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : statusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Status Overview</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : statusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>

        {/* Tasks by Category */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Tasks by Category</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : categoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>

        {/* Top Assignees */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Top Assignees by Task Count</h2>
          {loading ? (
            <div className="flex items-center justify-center text-muted-foreground py-8">Loading...</div>
          ) : stats.tasksByAssignee?.length > 0 ? (
            <div className="space-y-4">
              {stats.tasksByAssignee.map((assignee: any, index: number) => {
                const maxCount = Math.max(...stats.tasksByAssignee.map((a: any) => a.count));
                const percentage = (assignee.count / maxCount) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{assignee.name}</span>
                      <span className="text-muted-foreground">{assignee.count} tasks</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground py-8">No data available</div>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Overdue Tasks
          </h2>
          {loading ? (
            <div className="flex items-center justify-center text-muted-foreground py-8">Loading...</div>
          ) : stats.overdueTasksList?.length > 0 ? (
            <div className="space-y-3">
              {stats.overdueTasksList.map((task: any) => (
                <div key={task.id} className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg flex flex-col gap-1">
                  <div className="flex justify-between items-start gap-2">
                    <Link href={`/tasks/${task.id}`} className="font-medium text-sm hover:underline line-clamp-1">
                      {task.title}
                    </Link>
                    <span className="text-xs font-semibold text-destructive whitespace-nowrap bg-destructive/10 px-2 py-0.5 rounded">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No Date"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="truncate">{task.client?.companyName || "No Client"}</span>
                    <span>{task.assignedTo?.name || "Unassigned"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground py-8">No overdue tasks</div>
          )}
        </div>

        {/* Due This Week */}
        <div className="bg-card border rounded-xl p-6 shadow-sm md:col-span-2">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Due This Week
          </h2>
          {loading ? (
            <div className="flex items-center justify-center text-muted-foreground py-8">Loading...</div>
          ) : stats.dueThisWeek?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium px-4">Task</th>
                    <th className="pb-3 font-medium px-4">Client</th>
                    <th className="pb-3 font-medium px-4">Assignee</th>
                    <th className="pb-3 font-medium px-4">Due Date</th>
                    <th className="pb-3 font-medium px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.dueThisWeek.map((task: any) => (
                    <tr key={task.id} className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <Link href={`/tasks/${task.id}`} className="hover:underline">
                          {task.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{task.client?.companyName || "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{task.assignedTo?.name || "Unassigned"}</td>
                      <td className="py-3 px-4">
                        {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground py-8">No tasks due this week</div>
          )}
        </div>
      </div>
    </div>
  );
}
