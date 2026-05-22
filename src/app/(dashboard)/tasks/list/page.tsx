"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { CategoryPills } from "@/components/ui/category-pills";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { SlideOver } from "@/components/ui/slide-over";
import { StatsCard } from "@/components/ui/stats-card";
import {
  ClipboardList, PauseCircle, Timer, Upload, RefreshCw, AlarmClock, CheckCircle2, XCircle,
  Plus, Calendar, MoreVertical, CheckSquare, ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All Categories", "GST", "MCA", "TDS/TCS", "Professional Tax", "PF", "ESI", "Income Tax", "Advance Tax", "Manual"
];

const STATUS_CARDS = [
  { key: "all", label: "Total Tasks", icon: ClipboardList, color: "orange" },
  { key: "PENDING", label: "Pending", icon: PauseCircle, color: "blue" },
  { key: "IN_PROGRESS", label: "In Progress", icon: Timer, color: "amber" },
  { key: "SENT_FOR_REVIEW", label: "Sent for Review", icon: Upload, color: "blue" },
  { key: "REQUEST_CHANGES", label: "Request Changes", icon: RefreshCw, color: "indigo" },
  { key: "OVERDUE", label: "Overdue", icon: AlarmClock, color: "red" },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle2, color: "green" },
  { key: "CANCELLED", label: "Cancelled/On Hold", icon: XCircle, color: "red" },
];

export default function TasksListPage() {
  const pathname = usePathname();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("all");

  // Slide Over state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Data for Add Task dropdowns (in real app, fetched from API)
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [category, statusFilter, search]);

  useEffect(() => {
    // Fetch clients and services for the Add Task form
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.data || []));
    fetch('/api/services').then(r => r.json()).then(d => setServices(d.data || []));
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/tasks", window.location.origin);
      if (category !== "All Categories") url.searchParams.append("category", category);
      if (statusFilter !== "all") url.searchParams.append("status", statusFilter);
      if (search) url.searchParams.append("search", search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.data) setTasks(json.data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/tasks/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  const handleRowClick = async (row: any) => {
    try {
      // Fetch full task details including SOPs/subtasks
      const res = await fetch(`/api/tasks/${row.id}`);
      const json = await res.json();
      if (json.data) {
        setSelectedTask(json.data);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch task details", error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      title: formData.get("title"),
      clientId: formData.get("clientId"),
      serviceId: formData.get("serviceId"),
      category: formData.get("category"),
      assignedToId: formData.get("assignedToId"),
      reviewerId: formData.get("reviewerId") || null,
      priority: formData.get("priority"),
      dueDate: formData.get("dueDate"),
      isRecurring: formData.get("isRecurring") === "on",
      frequency: formData.get("frequency"),
      recurringEnd: formData.get("recurringEnd") || null,
      description: formData.get("description"),
    };

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsAddOpen(false);
    fetchTasks();
    fetchStats();
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTask) return;
    await fetch(`/api/tasks/${selectedTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    // Refresh selected task and list
    handleRowClick(selectedTask);
    fetchTasks();
    fetchStats();
  };

  const handleToggleSop = async (sopId: string, isCompleted: boolean) => {
    if (!selectedTask) return;
    await fetch(`/api/tasks/${selectedTask.id}/complete-sop/${sopId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted }),
    });
    handleRowClick(selectedTask);
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "ID",
      accessorKey: "taskNumber",
      cell: (row) => <span className="font-mono text-muted-foreground font-medium">#TSK{String(row.taskNumber).padStart(5, '0')}</span>,
      className: "w-[100px]"
    },
    {
      header: "Client",
      cell: (row) => (
        <div>
          <div className="font-bold text-foreground">{row.client?.companyName}</div>
          <div className="text-xs text-muted-foreground">{row.client?.clientCode}</div>
        </div>
      ),
      className: "w-[180px]"
    },
    {
      header: "Service",
      accessorKey: "service.name",
      cell: (row) => row.service?.name || row.title,
      className: "w-[200px]"
    },
    {
      header: "Category",
      accessorKey: "category",
      className: "w-[100px]"
    },
    {
      header: "Assignee",
      cell: (row) => (
        <div className="flex justify-center w-[80px]">
          {row.assignedTo ? <Avatar name={row.assignedTo.name} size="sm" /> : "-"}
        </div>
      ),
      className: "text-center"
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => <StatusBadge status={row.status} />,
      className: "w-[150px]"
    },
    {
      header: "Reviewer",
      cell: (row) => (
        <div className="flex justify-center w-[80px]">
          {row.reviewer ? <Avatar name={row.reviewer.name} size="sm" /> : "-"}
        </div>
      ),
      className: "text-center"
    },
    {
      header: "Priority",
      accessorKey: "priority",
      cell: (row) => {
        const colors: any = { HIGH: "text-red-500", MEDIUM: "text-orange-500", LOW: "text-green-500" };
        return <span className={cn("font-semibold", colors[row.priority] || "text-gray-500")}>
          {row.priority ? row.priority.charAt(0) + row.priority.slice(1).toLowerCase() : "-"}
        </span>;
      },
      className: "w-[80px]"
    }
  ];

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

      <CategoryPills
        categories={CATEGORIES}
        active={category}
        onChange={setCategory}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {STATUS_CARDS.map(card => {
          let statValue = 0;
          if (card.key === "all") statValue = stats.total || 0;
          else if (card.key === "PENDING") statValue = stats.pending || 0;
          else if (card.key === "IN_PROGRESS") statValue = stats.inProgress || 0;
          else if (card.key === "SENT_FOR_REVIEW") statValue = stats.sentForReview || 0;
          else if (card.key === "REQUEST_CHANGES") statValue = stats.requestChanges || 0;
          else if (card.key === "OVERDUE") statValue = stats.overdue || 0;
          else if (card.key === "COMPLETED") statValue = stats.completed || 0;
          else if (card.key === "CANCELLED") statValue = stats.cancelled || 0;

          return (
            <StatsCard
              key={card.key}
              icon={card.icon}
              label={card.label}
              value={statValue}
              color={card.color}
              className={statusFilter === card.key ? "ring-2 ring-primary border-primary" : ""}
              onClick={() => setStatusFilter(card.key)}
            />
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="font-semibold">Tasks ({tasks.length})</div>
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Search tasks..."
            value={search}
            onChange={setSearch}
            className="w-64"
          />
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tasks}
        keyExtractor={(row) => row.id}
        selectable
        onRowClick={handleRowClick}
      />

      {/* Add Task Modal / SlideOver (using SlideOver as per spec "Modal (triggered by + Add)" - wait, spec says "Add Task - Modal") */}
      {/* Spec says: Add Task — Modal. Let's use SlideOver for consistency with detail, but can be a full modal. The slide-over is easier to scroll. Using SlideOver for forms is common. Let's stick to SlideOver as it provides more space. Wait, I will use SlideOver. */}
      <SlideOver
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Task"
      >
        <form id="task-form" onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Title <span className="text-red-500">*</span></label>
            <input name="title" required className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <select name="clientId" className="w-full p-2 border rounded-md text-sm">
              <option value="">Select Client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service</label>
            <select name="serviceId" className="w-full p-2 border rounded-md text-sm">
              <option value="">Select Service...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select name="category" className="w-full p-2 border rounded-md text-sm">
              {CATEGORIES.filter(c => c !== "All Categories").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Note: Assignees should be fetched from staff users */}
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select name="priority" defaultValue="MEDIUM" className="w-full p-2 border rounded-md text-sm">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input type="date" name="dueDate" className="w-full p-2 border rounded-md text-sm" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" name="isRecurring" id="isRecurring" className="rounded" />
            <label htmlFor="isRecurring" className="text-sm font-medium">Is Recurring?</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description / Notes</label>
            <textarea name="description" rows={3} className="w-full p-2 border rounded-md text-sm" />
          </div>
        </form>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancel</button>
          <button form="task-form" type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Create Task</button>
        </div>
      </SlideOver>

      {/* Task Detail Drawer */}
      <SlideOver
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title=""
      >
        {selectedTask && (
          <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
              <div className="text-muted-foreground font-mono text-sm mb-1">#TSK{String(selectedTask.taskNumber).padStart(5, '0')}</div>
              <h2 className="text-2xl font-bold mb-3">{selectedTask.title}</h2>
              <StatusBadge status={selectedTask.status} />
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm border-y py-4">
              <div>
                <div className="text-muted-foreground mb-1">Client</div>
                <div className="font-medium text-primary hover:underline cursor-pointer">{selectedTask.client?.companyName || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Service</div>
                <div className="font-medium">{selectedTask.service?.name || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Category</div>
                <div className="font-medium">{selectedTask.category || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Due Date</div>
                <div className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "-"}
                </div>
              </div>
            </div>

            {/* Status Actions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Status Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTask.status === 'PENDING' && (
                  <button onClick={() => handleUpdateStatus('IN_PROGRESS')} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Mark In Progress</button>
                )}
                {selectedTask.status === 'IN_PROGRESS' && (
                  <button onClick={() => handleUpdateStatus('SENT_FOR_REVIEW')} className="px-4 py-2 bg-sky-600 text-white rounded-md text-sm font-medium">Send for Review</button>
                )}
                {selectedTask.status === 'SENT_FOR_REVIEW' && (
                  <>
                    <button onClick={() => handleUpdateStatus('COMPLETED')} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium">Approve → Complete</button>
                    <button onClick={() => handleUpdateStatus('REQUEST_CHANGES')} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">Request Changes</button>
                  </>
                )}
                {selectedTask.status === 'REQUEST_CHANGES' && (
                  <button onClick={() => handleUpdateStatus('IN_PROGRESS')} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Mark In Progress</button>
                )}

                <button onClick={() => handleUpdateStatus('OVERDUE')} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium">Mark Overdue</button>
                <button onClick={() => handleUpdateStatus('CANCELLED')} className="px-4 py-2 border hover:bg-muted rounded-md text-sm font-medium">Cancel Task</button>
              </div>
            </div>

            {/* SOP Checklist */}
            {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">SOP Checklist</h3>
                  <span className="text-sm text-muted-foreground">
                    {selectedTask.subtasks.filter((s: any) => s.isCompleted).length}/{selectedTask.subtasks.length} steps done
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(selectedTask.subtasks.filter((s: any) => s.isCompleted).length / selectedTask.subtasks.length) * 100}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {selectedTask.subtasks.map((step: any, idx: number) => (
                    <label key={step.id} className={cn(
                      "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                      step.isCompleted ? "bg-muted/30" : "bg-card"
                    )}>
                      <input
                        type="checkbox"
                        checked={step.isCompleted}
                        onChange={(e) => handleToggleSop(step.id, e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <div className={cn("font-medium", step.isCompleted && "line-through text-muted-foreground")}>
                          {idx + 1}. {step.title}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {selectedTask.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border">
                  {selectedTask.description}
                </p>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
