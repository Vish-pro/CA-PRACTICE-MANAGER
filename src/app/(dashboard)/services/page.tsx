"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { AlertTriangle, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function dueDateLabel(dateStr: string | null) {
  if (!dateStr) return { label: "No due date", color: "text-muted-foreground", urgent: false };
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "text-red-600 font-bold", urgent: true };
  if (diffDays === 0) return { label: "Due today", color: "text-orange-600 font-bold", urgent: true };
  if (diffDays <= 3) return { label: `${diffDays}d left`, color: "text-orange-500 font-semibold", urgent: true };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: "text-yellow-600", urgent: false };
  return { label: due.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), color: "text-muted-foreground", urgent: false };
}

export default function ActiveServicesPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/tasks", window.location.origin);
      url.searchParams.set("limit", "200");
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) {
        const active = json.data
          .filter((t: any) => !["COMPLETED", "CANCELLED"].includes(t.status))
          .sort((a: any, b: any) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });
        setTasks(active);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [search]);

  const statusOptions = ["all", "OVERDUE", "PENDING", "IN_PROGRESS", "SENT_FOR_REVIEW", "REQUEST_CHANGES"];

  const displayed = statusFilter === "all"
    ? tasks
    : tasks.filter(t => t.status === statusFilter);

  const overdue = tasks.filter(t => t.status === "OVERDUE" || (t.dueDate && new Date(t.dueDate) < new Date() && !["COMPLETED", "CANCELLED"].includes(t.status))).length;
  const dueToday = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  }).length;
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1b4d3e]">Running Services</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Active work queue ordered by nearest due date</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search tasks..." value={search} onChange={setSearch} className="w-56" />
          <button onClick={fetchTasks} className="p-2 border rounded-md hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <div className="text-xl font-bold text-red-700">{overdue}</div>
            <div className="text-[10px] text-red-500 font-medium uppercase tracking-wide">Overdue</div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <Clock className="w-5 h-5 text-orange-500 shrink-0" />
          <div>
            <div className="text-xl font-bold text-orange-700">{dueToday}</div>
            <div className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">Due Today</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <div className="text-xl font-bold text-blue-700">{inProgress}</div>
            <div className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">In Progress</div>
          </div>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {statusOptions.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              statusFilter === s
                ? "bg-[#1b4d3e] text-white border-[#1b4d3e]"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {s === "all" ? `All (${tasks.length})` : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading active work queue...</div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No active tasks found.</div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Task / Service</th>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Assignee</th>
                <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.map((task) => {
                const due = dueDateLabel(task.dueDate);
                return (
                  <tr
                    key={task.id}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className={cn(
                      "hover:bg-muted/40 cursor-pointer transition-colors",
                      due.urgent && "bg-red-50/40"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{task.title}</div>
                      {task.service?.name && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{task.service.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.client ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.client.companyName} size="sm" />
                          <span className="text-xs">{task.client.companyName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignedTo.name} size="sm" />
                          <span className="text-xs">{task.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs", due.color)}>{due.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
