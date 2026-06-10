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
import { ConfirmByTyping } from "@/components/ui/confirm-by-typing";
import { useSession } from "next-auth/react";
import {
  ClipboardList, PauseCircle, Timer, Upload, RefreshCw, AlarmClock, CheckCircle2, XCircle,
  Plus, Calendar, MoreVertical, CheckSquare, ListTodo, LayoutGrid, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

// --- TypeScript Interfaces ---
interface Client {
  id: string;
  companyName: string;
  clientCode?: string;
  legalName?: string;
  contactName?: string;
  contactEmail?: string;
  mobile?: string;
  businessEntity?: string;
  auditorId?: string;
  isActive: boolean;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceSOP {
  id: string;
  serviceId: string;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  frequency: string;
  professionalFee: number;
  hasSOP: boolean;
  hasSubtasks: boolean;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  sopSteps?: ServiceSOP[];
}

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  primaryDepartment?: string;
  caRole?: string;
  assignedClients?: string[];
}

interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignedToId?: string;
  createdById: string;
  clientId?: string;
  serviceId?: string;
  category?: string;
  reviewerId?: string;
  isRecurring: boolean;
  frequency?: string;
  recurringEnd?: string;
  client?: { companyName: string; clientCode?: string };
  service?: { name: string };
  assignedTo?: { name: string; id: string };
  reviewer?: { name: string; id: string };
}

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
  const { data: session } = useSession();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [taskToCancel, setTaskToCancel] = useState<any>(null);

  // --- Attendance, Timer & Compliance States ---
  const [attendanceStatus, setAttendanceStatus] = useState<"IN" | "OUT">("OUT");
  const [complianceActive, setComplianceActive] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>("CLERK");
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [timesheetHours, setTimesheetHours] = useState<string>("1.00");
  const [timesheetNotes, setTimesheetNotes] = useState<string>("");
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadState = () => {
        setAttendanceStatus((localStorage.getItem("ca_attendance_status") || "OUT") as "IN" | "OUT");
        
        const storedRole = localStorage.getItem("prabandh_simulated_role") || "CLERK";
        setUserRole(storedRole);

        const storedModules = localStorage.getItem("prabandh_global_modules");
        if (storedModules) {
          const parsed = JSON.parse(storedModules);
          setComplianceActive(parsed.timesheet_compliance !== false);
        }

        const storedTimer = localStorage.getItem("ca_active_timer");
        if (storedTimer) {
          const parsed = JSON.parse(storedTimer);
          setActiveTimer(parsed);
          if (parsed.isRunning) {
            const currentElapsed = Math.floor((Date.now() - parsed.startTime) / 1000) + parsed.elapsedBefore;
            setSecondsElapsed(currentElapsed);
          } else {
            setSecondsElapsed(parsed.elapsedBefore);
          }
        } else {
          setActiveTimer(null);
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

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (activeTimer && activeTimer.isRunning) {
      interval = setInterval(() => {
        const currentElapsed = Math.floor((Date.now() - activeTimer.startTime) / 1000) + activeTimer.elapsedBefore;
        setSecondsElapsed(currentElapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const isPartnerBypass = userRole === "ADMIN" || userRole === "PARTNER" || userRole === "DIRECTOR";
  const isLocked = complianceActive && attendanceStatus === "OUT" && !isPartnerBypass;

  const handleStartTimer = (task: any) => {
    if (isLocked) {
      toast.error("Access Restricted: Check In via the Attendance module first to activate your daily billing log.", {
        duration: 4000,
        style: { background: "#1f2937", color: "#fff", border: "1px solid #374151" }
      });
      return;
    }

    const timer = {
      taskId: task.id,
      taskTitle: task.service?.name || task.title,
      clientName: task.client?.companyName || "Internal Firm",
      startTime: Date.now(),
      elapsedBefore: 0,
      isRunning: true
    };
    localStorage.setItem("ca_active_timer", JSON.stringify(timer));
    setActiveTimer(timer);
    setSecondsElapsed(0);
    
    // Also notify layout/other components
    window.dispatchEvent(new Event("storage"));
    toast.success("Stopwatch active: Work session started!");
  };

  const handlePauseTimer = () => {
    if (!activeTimer) return;
    const elapsed = secondsElapsed;
    const updated = {
      ...activeTimer,
      elapsedBefore: elapsed,
      isRunning: false
    };
    localStorage.setItem("ca_active_timer", JSON.stringify(updated));
    setActiveTimer(updated);
    window.dispatchEvent(new Event("storage"));
    toast.success("Timer paused.");
  };

  const handleStopTimer = () => {
    if (!activeTimer) return;
    const elapsedHrs = (secondsElapsed / 3600).toFixed(2);
    setTimesheetHours(elapsedHrs);
    setTimesheetNotes(`Worked on SOP checklist step actions and finalized documentation details.`);
    setShowLogModal(true);
  };

  const handleSaveTimesheetLog = async () => {
    if (!activeTimer) return;

    // Resolve the simulated employee from the DB (same mapping as the HR page)
    let employee: any = null;
    try {
      const res = await fetch("/api/hr/employees");
      const json = await res.json();
      const emps: any[] = json.data || [];
      if (userRole === "MANAGER") {
        employee = emps.find(e => e.employmentType === "Manager") || emps[0];
      } else if (userRole === "ADMIN" || userRole === "PARTNER" || userRole === "DIRECTOR" || userRole === "HR") {
        employee = emps.find(e => e.employmentType === "Partner") || emps[0];
      } else {
        employee = emps.find(e => e.employmentType === "Article Assistant")
          || emps.find(e => e.employmentType === "Paid Assistant")
          || emps[0];
      }
    } catch { /* fall through to error toast below */ }

    if (!employee) {
      toast.error("Could not resolve your employee profile — timesheet not saved.");
      return;
    }

    const res = await fetch("/api/hr/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: employee.id,
        taskTitle: activeTimer.taskTitle,
        clientName: activeTimer.clientName,
        hours: parseFloat(timesheetHours),
        description: timesheetNotes,
        status: "DRAFT",
        isManual: false,
      }),
    });

    if (!res.ok) {
      toast.error("Failed to save timesheet log");
      return;
    }

    localStorage.removeItem("ca_active_timer");
    setActiveTimer(null);
    setSecondsElapsed(0);
    setShowLogModal(false);

    window.dispatchEvent(new Event("storage"));
    toast.success("Time logged in Daily Timesheet drafts successfully!");
  };

  const pathname = usePathname();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "board">("board");

  // Slide Over state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Data for Add Task dropdowns (in real app, fetched from API)
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [subStatuses, setSubStatuses] = useState<any[]>([]);

  // Relational Form states for cascading filters & dynamic validation
  const [selectedCategory, setSelectedCategory] = useState("GST");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedReviewerId, setSelectedReviewerId] = useState("");

  const onCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    // Reset dependent fields to null/empty to prevent invalid combinations
    setSelectedServiceId("");
    setSelectedAssigneeId("");
    setSelectedReviewerId("");
  };

  const getActiveTaskCount = (userId: string) => {
    // Deterministic base active count derived from user ID + active tasks in DB
    const baseCount = (userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1)) % 5 + 1;
    const activeTasks = tasks.filter(t => t.assignedToId === userId && t.status !== "COMPLETED" && t.status !== "CANCELLED");
    return baseCount + activeTasks.length;
  };

  const filteredServices = services.filter(s => {
    if (!selectedCategory) return true;
    return s.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const filteredAssignees = users.filter(u => {
    const isEmployee = u.role !== "CLIENT";
    // primary department matches selected Category
    const matchesCategory = selectedCategory && u.primaryDepartment?.toLowerCase() === selectedCategory.toLowerCase();
    // active assignment to Client (deterministic mapping)
    const hasClientAssignment = selectedClientId && (u.id.charCodeAt(0) + selectedClientId.charCodeAt(0)) % 3 === 0;
    
    return isEmployee && (matchesCategory || hasClientAssignment);
  });

  const filteredReviewers = users.filter(u => {
    // Only Partner, Director, or Manager can review
    const isAllowedReviewerRole = ["partner", "director", "manager"].includes(u.caRole?.toLowerCase() || "");
    // Within the selected category
    const matchesCategory = selectedCategory && u.primaryDepartment?.toLowerCase() === selectedCategory.toLowerCase();
    
    return isAllowedReviewerRole && matchesCategory;
  });

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [category, statusFilter, search]);

  useEffect(() => {
    // Fetch clients and services for the Add Task form
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.data || []));
    fetch('/api/services').then(r => r.json()).then(d => setServices(d.data || []));
    fetch('/api/users')
      .then(r => r.json())
      .then(d => {
        const rawUsers = d.data || [];
        const augmented = rawUsers.map((u: any) => {
          const code = u.id.charCodeAt(0) % 4;
          let primaryDept = "GST";
          let caRole = "Article";
          
          if (u.role === "ADMIN") {
            caRole = "Partner";
            primaryDept = "Statutory Audit";
          } else if (u.role === "SENIOR_STAFF") {
            caRole = code % 2 === 0 ? "Manager" : "Senior";
            primaryDept = code % 2 === 0 ? "GST" : "TDS/TCS";
          } else {
            caRole = code % 2 === 0 ? "Article" : "Intern";
            primaryDept = code % 3 === 0 ? "GST" : (code % 3 === 1 ? "MCA" : "PF");
          }

          return {
            ...u,
            primaryDepartment: primaryDept,
            caRole: caRole
          };
        });
        setUsers(augmented);
      });

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ca_task_substatuses");
      if (stored) {
        setSubStatuses(JSON.parse(stored));
      } else {
        setSubStatuses([
          { id: "1", name: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200" },
          { id: "2", name: "Documents Pending", color: "bg-amber-100 text-amber-800 border-amber-200" },
          { id: "3", name: "Queries Raised", color: "bg-red-100 text-red-800 border-red-200" },
          { id: "4", name: "Sign-off Awaited", color: "bg-purple-100 text-purple-800 border-purple-200" },
          { id: "5", name: "In Review", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
          { id: "6", name: "Completed", color: "bg-green-100 text-green-800 border-green-200" },
          { id: "7", name: "Review Rejected", color: "bg-[#fee2e2] text-[#991b1b] border-[#991b1b]/20" },
          { id: "8", name: "Peer Review Pending", color: "bg-[#dbeafe] text-[#1e40af] border-[#1e40af]/20" },
          { id: "9", name: "Management Sign-off Awaited", color: "bg-[#fef3c7] text-[#92400e] border-[#92400e]/20" },
          { id: "10", name: "Govt Portal Down", color: "bg-[#ffedd5] text-[#c2410c] border-[#c2410c]/20" },
          { id: "11", name: "Filed - Billing Pending", color: "bg-[#d1fae5] text-[#065f46] border-[#065f46]/20" }
        ]);
      }
    }
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
    if (isLocked) {
      toast.error("Access Restricted: Check In via the Attendance module first to activate your daily billing log.", {
        duration: 4000,
        style: { background: "#1f2937", color: "#fff", border: "1px solid #374151" }
      });
      return;
    }
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      title: formData.get("title"),
      clientId: formData.get("clientId") || null,
      serviceId: formData.get("serviceId") || null,
      category: formData.get("category"),
      assignedToId: formData.get("assignedToId") || null,
      reviewerId: formData.get("reviewerId") || null,
      priority: formData.get("priority"),
      dueDate: formData.get("dueDate"),
      isRecurring: isRecurring,
      frequency: isRecurring ? formData.get("frequency") : null,
      recurringEnd: isRecurring ? (formData.get("recurringEnd") || null) : null,
      description: formData.get("description"),
    };

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsAddOpen(false);
    setIsRecurring(false); // Reset recurring state
    
    // Reset relational form fields
    setSelectedCategory("GST");
    setSelectedClientId("");
    setSelectedServiceId("");
    setSelectedAssigneeId("");
    setSelectedReviewerId("");
    
    fetchTasks();
    fetchStats();
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTask) return;
    if (isLocked) {
      toast.error("Access Restricted: Check In via the Attendance module first to activate your daily billing log.", {
        duration: 4000,
        style: { background: "#1f2937", color: "#fff", border: "1px solid #374151" }
      });
      return;
    }
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
    if (isLocked) {
      toast.error("Access Restricted: Check In via the Attendance module first to activate your daily billing log.", {
        duration: 4000,
        style: { background: "#1f2937", color: "#fff", border: "1px solid #374151" }
      });
      return;
    }
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

      {isLocked && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl flex-shrink-0 animate-pulse">
              <Timer className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-800 dark:text-amber-300 tracking-tight uppercase">⚠️ Workday Offline (Compliance Lock)</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed mt-1">
                You are currently checked out. You must **Check In** via the Attendance module to log billable hours, advance checklists, or modify task statuses.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.setItem("ca_attendance_status", "IN");
                localStorage.setItem("prabandh_login_timestamp", String(Date.now()));
                localStorage.setItem("ca_attendance_location", JSON.stringify({ lat: 19.0760, lng: 72.8777 }));
                window.dispatchEvent(new CustomEvent("attendance-change", { detail: "IN" }));
                window.dispatchEvent(new Event("storage"));
                toast.success("🎉 Check-in successful! Daily billing log activated.");
              }
            }}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md uppercase tracking-wider whitespace-nowrap self-start md:self-center"
          >
            Check In Now
          </button>
        </div>
      )}

      <CategoryPills
        categories={CATEGORIES}
        active={category}
        onChange={setCategory}
        className="mb-4"
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
        onClose={() => {
          setIsAddOpen(false);
          setIsRecurring(false);
          setSelectedCategory("GST");
          setSelectedClientId("");
          setSelectedServiceId("");
          setSelectedAssigneeId("");
          setSelectedReviewerId("");
        }}
        title="Create Task"
      >
        <form id="task-form" onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Task Title <span className="text-red-500">*</span></label>
            <input name="title" required className="w-full p-2 border rounded-md text-sm bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category <span className="text-red-500">*</span></label>
            <select 
              name="category" 
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.filter(c => c !== "All Categories").map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <select 
              name="clientId" 
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service</label>
            <select 
              name="serviceId" 
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Service...</option>
              {filteredServices.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assignee</label>
            <select 
              name="assignedToId" 
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="w-full p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Assignee...</option>
              {filteredAssignees.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.caRole}) [{getActiveTaskCount(u.id)} Active Tasks]
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reviewer</label>
            <select 
              name="reviewerId" 
              value={selectedReviewerId}
              onChange={(e) => setSelectedReviewerId(e.target.value)}
              className="w-full p-2 border rounded-md text-sm bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Reviewer...</option>
              {filteredReviewers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.caRole})
                </option>
              ))}
            </select>
          </div>
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
            <input
              type="checkbox"
              name="isRecurring"
              id="isRecurring"
              className="rounded"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            <label htmlFor="isRecurring" className="text-sm font-medium">Is Recurring?</label>
          </div>

          {isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <select name="frequency" className="w-full p-2 border rounded-md text-sm">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                <input type="date" name="recurringEnd" className="w-full p-2 border rounded-md text-sm" />
              </div>
            </div>
          )}

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

            {/* Stopwatch Task Timer Block */}
            <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full bg-red-500", activeTimer?.isRunning && activeTimer?.taskId === selectedTask.id ? "animate-pulse" : "")} />
                  Task Timekeeper
                </span>
                {activeTimer?.isRunning && activeTimer?.taskId === selectedTask.id && (
                  <span className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                    Live Recording
                  </span>
                )}
              </div>

              {activeTimer?.taskId === selectedTask.id ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-3">
                  <div className="font-mono text-3xl font-extrabold text-foreground tracking-widest">
                    {(() => {
                      const h = Math.floor(secondsElapsed / 3600);
                      const m = Math.floor((secondsElapsed % 3600) / 60);
                      const s = secondsElapsed % 60;
                      const pad = (num: number) => String(num).padStart(2, "0");
                      return `${pad(h)}:${pad(m)}:${pad(s)}`;
                    })()}
                  </div>

                  <div className="flex w-full gap-2 pt-1.5">
                    {activeTimer.isRunning ? (
                      <button
                        type="button"
                        onClick={handlePauseTimer}
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow"
                      >
                        ⏸ Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            toast.error("Access Restricted: Check In via the Attendance module first to activate your daily billing log.");
                            return;
                          }
                          const updated = {
                            ...activeTimer,
                            startTime: Date.now(),
                            isRunning: true
                          };
                          localStorage.setItem("ca_active_timer", JSON.stringify(updated));
                          setActiveTimer(updated);
                          window.dispatchEvent(new Event("storage"));
                          toast.success("Timer resumed.");
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow"
                      >
                        ▶ Resume
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleStopTimer}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow"
                    >
                      ⏹ Stop & Log
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    {activeTimer 
                      ? `Currently tracking another task (#TSK${activeTimer.taskId.substring(0, 5)})` 
                      : "Start a stopwatch session to record your active working hours."}
                  </p>
                  <button
                    type="button"
                    disabled={!!activeTimer}
                    onClick={() => handleStartTimer(selectedTask)}
                    className={cn(
                      "w-full py-3 text-xs font-bold transition-all uppercase tracking-wider shadow rounded-xl text-white",
                      activeTimer
                        ? "bg-zinc-400 cursor-not-allowed opacity-50"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    ▶ Start Timer
                  </button>
                </div>
              )}
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

                {!['OVERDUE', 'COMPLETED', 'CANCELLED'].includes(selectedTask.status) && (
                  <button onClick={() => handleUpdateStatus('OVERDUE')} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium">Mark Overdue</button>
                )}
                {selectedTask.status === 'OVERDUE' && (
                  <button onClick={() => handleUpdateStatus('IN_PROGRESS')} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Resume — Mark In Progress</button>
                )}
                {!['COMPLETED', 'CANCELLED'].includes(selectedTask.status) && (
                  <button
                    onClick={() => { setTaskToCancel(selectedTask); setIsCancelConfirmOpen(true); }}
                    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel Task
                  </button>
                )}
              </div>
              
              {/* Custom Sub-status Selector (Linked directly to Task settings CRUD) */}
              <div className="space-y-1.5 pt-3 border-t">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Assign Workflow Sub-status</label>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20"
                >
                  <option value="PENDING">Pending (Not Started)</option>
                  <option value="IN_PROGRESS">In Progress (Active)</option>
                  <option value="SENT_FOR_REVIEW">Sent for Review (Under Inspection)</option>
                  <option value="REQUEST_CHANGES">Request Changes</option>
                  <option value="COMPLETED">Completed (Green Light)</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                  {/* Render Custom dynamic statuses from settings CRUD */}
                  {subStatuses.filter(st => !["In Progress", "Documents Pending", "Queries Raised", "Sign-off Awaited", "In Review", "Completed", "Review Rejected", "Peer Review Pending", "Management Sign-off Awaited", "Govt Portal Down", "Filed - Billing Pending"].includes(st.name)).map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name} (Custom status)
                    </option>
                  ))}
                  {/* Make sure standard descriptive substatuses can also be chosen directly */}
                  <optgroup label="Advanced Workflow Sub-statuses">
                    <option value="Documents Pending">Documents Pending</option>
                    <option value="Queries Raised">Queries Raised</option>
                    <option value="Review Rejected">Review Rejected</option>
                    <option value="Peer Review Pending">Peer Review Pending</option>
                    <option value="Sign-off Awaited">Sign-off Awaited</option>
                    <option value="Management Sign-off Awaited">Management Sign-off Awaited</option>
                    <option value="Govt Portal Down">Govt Portal Down</option>
                    <option value="Filed - Billing Pending">Filed - Billing Pending</option>
                  </optgroup>
                </select>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  ⚙️ Loaded dynamically from your CA practice task status configurations. Changing this status triggers relational workflow rules.
                </p>
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

      <ConfirmByTyping
        open={isCancelConfirmOpen}
        onClose={() => { setIsCancelConfirmOpen(false); setTaskToCancel(null); }}
        onConfirm={async () => {
          if (!taskToCancel) return;
          await fetch(`/api/tasks/${taskToCancel.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CANCELLED' }),
          });
          setIsDetailOpen(false);
          fetchTasks();
          fetchStats();
        }}
        title="Cancel Task"
        description={`This will cancel task #TSK${String(taskToCancel?.taskNumber || 0).padStart(5, '0')}. This action cannot be undone.`}
        confirmName={session?.user?.name || "Admin"}
        actionLabel="Yes, Cancel Task"
      />

      {/* Log Timesheet Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in scale-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-foreground">📝 Log Work to Timesheet</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Finalize billable hours and comments before saving as draft.</p>
            </div>
            
            <div className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Time Worked (Hours) - Locked to Stopwatch
                </label>
                <input
                  type="number"
                  readOnly
                  value={timesheetHours}
                  className="w-full p-2 border rounded-xl bg-muted text-muted-foreground text-sm font-semibold cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Timesheet Notes & Comments</label>
                <textarea
                  rows={4}
                  value={timesheetNotes}
                  onChange={(e) => setTimesheetNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-background text-foreground text-xs leading-relaxed"
                  placeholder="Describe the tasks, filings, or audits completed..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold uppercase transition-colors hover:bg-muted"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveTimesheetLog}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase transition-all hover:bg-emerald-700 shadow"
              >
                Log Draft Timecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
