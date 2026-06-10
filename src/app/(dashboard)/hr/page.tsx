"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, UserPlus, Calendar, CheckCircle, XCircle,
  Search, Filter, Plus, ArrowRight, UserCheck,
  Award, Clock, ChevronRight, GitPullRequest
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

// --- Types (shapes returned by /api/hr/*) ---
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  position: string;
  department: string;
  stage: "Applied" | "Interviewing" | "Offer" | "Onboarding" | "Hired" | "Rejected";
  appliedDate: string;
  notes?: string | null;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  jobTitle?: string | null;
  department?: string | null;
  employeeCode?: string | null;
  employmentType?: string | null;
  dateOfJoining?: string | null;
  reportingToId?: string | null;
  reportingTo?: { id: string; name: string; employeeCode?: string | null } | null;
  hodPartner?: string | null;
  icaiRegNo?: string | null;
  totalLeavesAllowed?: number;
  leavesTaken?: number;
  isActive: boolean;
}

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: "SICK" | "CASUAL" | "EARNED";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user?: { id: string; name: string; employeeCode?: string | null };
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
  isManual?: boolean;
  user?: { id: string; name: string; employeeCode?: string | null };
}

const PIPELINE_STAGES = ["Applied", "Interviewing", "Offer", "Onboarding", "Hired"] as const;

export default function HRMasterPage() {
  const [role, setRole] = useState<string>("CLERK");

  // DB-backed states
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetLog[]>([]);

  // HR Admin View Controllers
  const [hrActiveTab, setHrActiveTab] = useState<"pipeline" | "directory" | "orgtree" | "leaves" | "timesheets">("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  // Modals / SlideOvers
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isRejectedCandidatesDrawerOpen, setIsRejectedCandidatesDrawerOpen] = useState(false);
  const [selectedCandidateForHiring, setSelectedCandidateForHiring] = useState<Candidate | null>(null);

  // Employee Portal States
  const [employeeActiveTab, setEmployeeActiveTab] = useState<"profile" | "leaves" | "timesheets">("profile");
  const [hrDeskView, setHrDeskView] = useState<"management" | "personal">("management");

  // Manual log form states
  const [manualTaskTitle, setManualTaskTitle] = useState("");
  const [manualClientName, setManualClientName] = useState("");
  const [manualHours, setManualHours] = useState("1.00");
  const [manualDesc, setManualDesc] = useState("");

  // Edit timesheet states
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null);
  const [editingHours, setEditingHours] = useState<number>(0);
  const [editingDesc, setEditingDesc] = useState<string>("");

  // --- Data fetchers ---
  const fetchCandidates = useCallback(async () => {
    const res = await fetch("/api/hr/candidates");
    const json = await res.json();
    if (json.data) setCandidates(json.data);
  }, []);

  const fetchEmployees = useCallback(async () => {
    const res = await fetch("/api/hr/employees");
    const json = await res.json();
    if (json.data) setEmployees(json.data);
  }, []);

  const fetchLeaves = useCallback(async () => {
    const res = await fetch("/api/hr/leaves");
    const json = await res.json();
    if (json.data) setLeaves(json.data);
  }, []);

  const fetchTimesheets = useCallback(async () => {
    const res = await fetch("/api/hr/timesheets");
    const json = await res.json();
    if (json.data) setTimesheets(json.data);
  }, []);

  useEffect(() => {
    const checkRole = () => {
      const stored = localStorage.getItem("prabandh_simulated_role");
      if (stored) setRole(stored);
      else setRole("CLERK");
    };
    checkRole();
    window.addEventListener("storage", checkRole);
    window.addEventListener("role-change", checkRole as EventListener);

    fetchCandidates();
    fetchEmployees();
    fetchLeaves();
    fetchTimesheets();

    return () => {
      window.removeEventListener("storage", checkRole);
      window.removeEventListener("role-change", checkRole as EventListener);
    };
  }, [fetchCandidates, fetchEmployees, fetchLeaves, fetchTimesheets]);

  // --- Simulated current employee (based on role switcher) ---
  const me: Employee | null = useMemo(() => {
    if (employees.length === 0) return null;
    if (role === "MANAGER") return employees.find(e => e.employmentType === "Manager") || employees[0];
    if (role === "ADMIN" || role === "PARTNER" || role === "DIRECTOR" || role === "HR")
      return employees.find(e => e.employmentType === "Partner") || employees[0];
    return employees.find(e => e.employmentType === "Article Assistant")
      || employees.find(e => e.employmentType === "Paid Assistant")
      || employees[0];
  }, [employees, role]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    candidates.forEach(c => { if (c.department) set.add(c.department); });
    return Array.from(set).sort();
  }, [employees, candidates]);

  const partners = useMemo(() => employees.filter(e => e.employmentType === "Partner"), [employees]);
  const reportsOf = useCallback((id: string) => employees.filter(e => e.reportingToId === id), [employees]);

  // --- Recruitment Flow Action Handlers ---
  const handleAddCandidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await fetch("/api/hr/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        position: data.get("position"),
        department: data.get("department"),
        notes: data.get("notes"),
      }),
    });
    if (res.ok) {
      setIsCandidateModalOpen(false);
      fetchCandidates();
      toast.success("New Candidate added to recruitment pipeline!");
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || "Failed to add candidate");
    }
  };

  const updateCandidateStage = async (id: string, stage: Candidate["stage"]) => {
    const res = await fetch(`/api/hr/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) fetchCandidates();
    return res.ok;
  };

  const handleAdvanceCandidate = async (id: string) => {
    const cand = candidates.find(c => c.id === id);
    if (!cand) return;
    const currentIndex = PIPELINE_STAGES.indexOf(cand.stage as typeof PIPELINE_STAGES[number]);
    if (currentIndex < 0 || currentIndex >= PIPELINE_STAGES.length - 1) return;
    const nextStage = PIPELINE_STAGES[currentIndex + 1];
    if (nextStage === "Hired") {
      // Trigger conversion flow — actual stage change happens on onboard
      setSelectedCandidateForHiring(cand);
      setIsEmployeeModalOpen(true);
    } else {
      const ok = await updateCandidateStage(id, nextStage);
      if (ok) toast.success(`Candidate '${cand.name}' advanced to stage '${nextStage}'`);
      else toast.error("Failed to advance candidate");
    }
  };

  const handleRejectCandidate = async (id: string) => {
    if (!confirm("Are you sure you want to reject this candidate? This will archive their card.")) return;
    const ok = await updateCandidateStage(id, "Rejected");
    if (ok) toast.success("Candidate marked as rejected.");
    else toast.error("Failed to reject candidate");
  };

  const handleRestoreCandidate = async (id: string) => {
    const ok = await updateCandidateStage(id, "Applied");
    if (ok) toast.success("Candidate restored back to Applied stage!");
    else toast.error("Failed to restore candidate");
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const empType = data.get("employment_type") as string;

    const res = await fetch("/api/hr/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        employeeCode: data.get("empId"),
        employmentType: empType,
        department: data.get("department"),
        dateOfJoining: data.get("date_of_joining"),
        reportingToId: data.get("reporting_to") || null,
        hodPartner: data.get("hod_partner"),
        icaiRegNo: data.get("icai_reg_no"),
        candidateId: selectedCandidateForHiring?.id || null,
      }),
    });

    if (res.ok) {
      const name = data.get("name");
      setIsEmployeeModalOpen(false);
      setSelectedCandidateForHiring(null);
      form.reset();
      fetchEmployees();
      fetchCandidates();
      toast.success(`🎉 ${name} successfully onboarded as a new active team member!`);
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || "Failed to onboard employee");
    }
  };

  // --- Leave Requests Action Handlers ---
  const handleLeaveStatusChange = async (id: string, newStatus: "APPROVED" | "REJECTED") => {
    const res = await fetch(`/api/hr/leaves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchLeaves();
      fetchEmployees(); // refresh leavesTaken counters
      toast.success(`Leave request successfully ${newStatus.toLowerCase()}!`);
    } else {
      toast.error("Failed to update leave status");
    }
  };

  const handleApplyLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!me) { toast.error("Employee profile not loaded yet"); return; }
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    const res = await fetch("/api/hr/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: me.id,
        startDate: data.get("startDate"),
        endDate: data.get("endDate"),
        type: data.get("leaveType"),
        reason: data.get("reason"),
      }),
    });
    if (res.ok) {
      form.reset();
      fetchLeaves();
      toast.success("Leave application submitted successfully for senior/supervisor approval!");
    } else {
      toast.error("Failed to submit leave application");
    }
  };

  // --- Timesheet Action Handlers ---
  const handleTimesheetStatusChange = async (id: string, status: "APPROVED" | "REJECTED") => {
    const res = await fetch(`/api/hr/timesheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchTimesheets();
      toast.success(status === "APPROVED" ? "Timesheet log approved successfully!" : "Timesheet log rejected.");
    } else {
      toast.error("Failed to update timesheet");
    }
  };

  const handleManualLog = async () => {
    if (!me) { toast.error("Employee profile not loaded yet"); return; }
    if (!manualTaskTitle || !manualClientName) {
      toast.error("Please fill required fields.");
      return;
    }
    const res = await fetch("/api/hr/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: me.id,
        taskTitle: manualTaskTitle,
        clientName: manualClientName,
        hours: parseFloat(manualHours),
        description: manualDesc,
        status: "DRAFT",
        isManual: true,
      }),
    });
    if (res.ok) {
      setManualTaskTitle("");
      setManualClientName("");
      setManualHours("1.00");
      setManualDesc("");
      fetchTimesheets();
      toast.success("Manual timesheet log saved in drafts!");
    } else {
      toast.error("Failed to save timesheet log");
    }
  };

  const handleSubmitAllDrafts = async () => {
    if (!me) return;
    const res = await fetch("/api/hr/timesheets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit-drafts", userId: me.id }),
    });
    if (res.ok) {
      fetchTimesheets();
      toast.success("All drafts submitted successfully for supervisor approval!");
    } else {
      toast.error("Failed to submit drafts");
    }
  };

  const handleSaveTimesheetEdit = async (id: string) => {
    const res = await fetch(`/api/hr/timesheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: editingHours, description: editingDesc }),
    });
    if (res.ok) {
      setEditingTimesheetId(null);
      fetchTimesheets();
      toast.success("Timecard log updated successfully!");
    } else {
      toast.error("Failed to update timecard");
    }
  };

  // --- Search & Filters ---
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === "All" || c.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const filteredEmployees = employees.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (e.name || "").toLowerCase().includes(q) ||
                          (e.employeeCode || "").toLowerCase().includes(q) ||
                          (e.employmentType || "").toLowerCase().includes(q);
    const matchesDept = deptFilter === "All" || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Calculate DOJ served length e.g. "8 months served"
  const getDojLength = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const doj = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - doj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return `${diffDays} days served`;
    const months = Math.floor(diffDays / 30.44);
    if (months < 12) return `${months} months served`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return `${years} yr ${remMonths} mos served`;
  };

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  // Articleship progress (2-year term under New Scheme)
  const articleProgress = useMemo(() => {
    if (!me?.dateOfJoining) return null;
    const doj = new Date(me.dateOfJoining);
    const termEnd = new Date(doj);
    termEnd.setFullYear(termEnd.getFullYear() + 2);
    const totalDays = Math.ceil((termEnd.getTime() - doj.getTime()) / (1000 * 3600 * 24));
    const served = Math.min(totalDays, Math.max(0, Math.ceil((Date.now() - doj.getTime()) / (1000 * 3600 * 24))));
    return {
      served,
      remaining: Math.max(0, totalDays - served),
      pct: Math.min(100, Math.round((served / totalDays) * 100)),
      start: doj,
      end: termEnd,
    };
  }, [me]);

  // --- Dynamic Dashboard rendering by Simulated Role ---
  const isHRAdmin = role === "HR" || role === "ADMIN" || role === "PARTNER" || role === "DIRECTOR";

  const mySupervisor = me?.reportingToId ? employees.find(e => e.id === me.reportingToId) : null;
  const myPeers = me?.reportingToId ? reportsOf(me.reportingToId).filter(e => e.id !== me.id) : [];
  const myReports = me ? reportsOf(me.id) : [];

  return (
    <div className="space-y-6">

      {/* 1. HEADER ZONE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">HR & Team Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {role === "HR" && hrDeskView === "personal"
              ? "Employee Self-Service hub, line reporting lineage, and leave scheduling portal."
              : isHRAdmin && (role !== "HR" || hrDeskView === "management")
                ? "Practice-wide human capital matrix, recruitment pipelines, and articleship compliance."
                : "Employee Self-Service hub, line reporting lineage, and leave scheduling portal."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === "HR" && (
            <div className="flex items-center bg-muted p-1 border rounded-xl shadow-inner gap-1">
              <button
                type="button"
                onClick={() => setHrDeskView("management")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5",
                  hrDeskView === "management"
                    ? "bg-card text-primary shadow font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                💼 Management Desk
              </button>
              <button
                type="button"
                onClick={() => setHrDeskView("personal")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5",
                  hrDeskView === "personal"
                    ? "bg-card text-primary shadow font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCheck className="w-3.5 h-3.5" />
                👤 Personal Desk
              </button>
            </div>
          )}

          {isHRAdmin && (role !== "HR" || hrDeskView === "management") && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRejectedCandidatesDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-950/20 dark:text-red-400 dark:hover:bg-red-950/10 rounded-lg text-xs font-bold transition-all uppercase"
              >
                <XCircle className="w-4 h-4 text-red-500" />
                Rejected Candidates ({candidates.filter(c => c.stage === "Rejected").length})
              </button>
              <button
                onClick={() => { setSelectedCandidateForHiring(null); setIsEmployeeModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 border border-primary text-primary hover:bg-primary/5 rounded-lg text-xs font-bold transition-all uppercase"
              >
                <UserPlus className="w-4 h-4" />
                Onboard Employee
              </button>
              <button
                onClick={() => setIsCandidateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1b4d3e] text-white hover:bg-emerald-950 rounded-lg text-xs font-bold transition-all uppercase"
              >
                <Plus className="w-4 h-4" />
                Add Candidate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. HR & ADMIN WORKSPACE (Partner/Admin/HR) */}
      {isHRAdmin && (role !== "HR" || hrDeskView === "management") ? (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* A. Platform Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Members</span>
                <h3 className="text-2xl font-bold tracking-tight mt-1">{employees.filter(e => e.isActive).length}</h3>
              </div>
              <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Article Assistants</span>
                <h3 className="text-2xl font-bold tracking-tight mt-1">
                  {employees.filter(e => e.employmentType === "Article Assistant").length}
                </h3>
              </div>
              <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Leaves</span>
                <h3 className="text-2xl font-bold tracking-tight mt-1">
                  {leaves.filter(l => l.status === "PENDING").length}
                </h3>
              </div>
              <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Candidates</span>
                <h3 className="text-2xl font-bold tracking-tight mt-1">
                  {candidates.filter(c => c.stage !== "Hired" && c.stage !== "Rejected").length}
                </h3>
              </div>
              <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
                <GitPullRequest className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* B. Navigation Tabs */}
          <div className="flex border-b border-border/80 overflow-x-auto">
            {([
              { key: "pipeline", icon: GitPullRequest, label: "Recruitment Pipeline" },
              { key: "directory", icon: Users, label: "Employee Directory" },
              { key: "orgtree", icon: Award, label: "Org Structure (Tree)" },
              { key: "leaves", icon: Calendar, label: "Leave Approvals" },
              { key: "timesheets", icon: Clock, label: "Subordinate Timesheets" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setHrActiveTab(tab.key)}
                className={cn(
                  "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 whitespace-nowrap",
                  hrActiveTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* C. Interactive Controls (Search & Filters) */}
          {(hrActiveTab === "pipeline" || hrActiveTab === "directory") && (
            <div className="flex flex-col md:flex-row gap-4 bg-muted/40 p-4 rounded-xl border">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={hrActiveTab === "pipeline" ? "Search candidates by name or role..." : "Search employees by name, role or code..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Dept Filter:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-background text-foreground border rounded px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all uppercase"
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* D. Dynamic Tabs Content View */}

          {/* Tab 1: Recruitment Pipeline */}
          {hrActiveTab === "pipeline" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map(stage => {
                const stageCandidates = filteredCandidates.filter(c => c.stage === stage);
                return (
                  <div key={stage} className="bg-muted/30 border border-border/80 rounded-xl p-3 min-w-[210px] flex flex-col h-[520px]">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1b4d3e] dark:text-emerald-400">{stage}</span>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        {stageCandidates.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {stageCandidates.map(c => (
                        <div key={c.id} className="bg-card border rounded-lg p-3 shadow-xs hover:border-[#1b4d3e] transition-all flex flex-col justify-between group h-[145px]">
                          <div>
                            <h4 className="text-xs font-bold text-foreground">{c.name}</h4>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-none">{c.position}</p>
                            <span className="inline-block text-[9px] bg-muted text-muted-foreground font-semibold px-1 rounded-sm mt-1 uppercase tracking-wide">
                              {c.department.split(" ")[0]}
                            </span>
                            {c.notes && (
                              <p className="text-[9px] text-muted-foreground/80 italic mt-2 line-clamp-2">
                                &ldquo;{c.notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {stage !== "Hired" && (
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60">
                              <button
                                onClick={() => handleRejectCandidate(c.id)}
                                className="text-[9px] text-red-500 hover:text-red-700 font-bold uppercase"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleAdvanceCandidate(c.id)}
                                className="flex items-center gap-0.5 text-[9px] text-primary hover:text-emerald-950 font-extrabold uppercase transition-all"
                              >
                                Advance
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {stageCandidates.length === 0 && (
                        <div className="h-full flex items-center justify-center border border-dashed border-border/60 rounded-lg p-4">
                          <span className="text-[10px] text-muted-foreground text-center">Empty Column</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Employee Directory */}
          {hrActiveTab === "directory" && (
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/60 uppercase text-muted-foreground font-bold border-b">
                    <tr>
                      <th className="px-4 py-3.5">Emp ID</th>
                      <th className="px-4 py-3.5">Name</th>
                      <th className="px-4 py-3.5">Designation</th>
                      <th className="px-4 py-3.5">Department</th>
                      <th className="px-4 py-3.5">Supervisor</th>
                      <th className="px-4 py-3.5">HOD Partner</th>
                      <th className="px-4 py-3.5">ICAI Registration</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-primary">{emp.employeeCode || "—"}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-[#1b4d3e] dark:text-emerald-400">{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground">{emp.email}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded font-semibold border",
                            emp.employmentType === "Partner" && "bg-black text-white border-black dark:bg-zinc-800 dark:border-zinc-700",
                            emp.employmentType === "Manager" && "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-950",
                            emp.employmentType === "Qualified CA" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950",
                            emp.employmentType === "Article Assistant" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950",
                            emp.employmentType === "Paid Assistant" && "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                          )}>
                            {emp.employmentType || emp.jobTitle || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold">{emp.department || "—"}</td>
                        <td className="px-4 py-4 text-muted-foreground font-medium">{emp.reportingTo?.name || "None"}</td>
                        <td className="px-4 py-4 text-muted-foreground font-medium">{emp.hodPartner || "—"}</td>
                        <td className="px-4 py-4 font-mono text-muted-foreground">{emp.icaiRegNo || "—"}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] border",
                            emp.isActive
                              ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900"
                              : "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", emp.isActive ? "bg-green-500 animate-pulse" : "bg-red-500")}></span>
                            {emp.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No active employees match search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Hierarchical Org Tree (built dynamically from reporting lines) */}
          {hrActiveTab === "orgtree" && (
            <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center">
              <div className="text-center max-w-md mb-6">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Hierarchical Tree</span>
                <h3 className="text-lg font-bold mt-1">CA Firm Org Structure</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Visually mapping the lines of accountability from senior partners down to the article desk.</p>
              </div>

              <div className="font-mono text-[11px] text-foreground border rounded-xl p-6 bg-muted/20 w-full overflow-x-auto shadow-inner leading-relaxed space-y-8">
                {partners.map(partner => {
                  const directReports = reportsOf(partner.id);
                  if (directReports.length === 0 && partners.length > 3) return null; // hide childless partners in big firms
                  return (
                    <div key={partner.id}>
                      {/* PARTNER CARD */}
                      <div className="flex justify-center">
                        <div className="bg-black text-white px-5 py-2.5 rounded-md border border-zinc-700 shadow-md text-center max-w-xs">
                          <div className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-400">Partner • {partner.employeeCode}</div>
                          <div className="font-bold text-xs">{partner.name}</div>
                          <div className="text-[9px] opacity-75 mt-0.5">{partner.department || partner.email}</div>
                        </div>
                      </div>

                      {directReports.length > 0 && (
                        <>
                          <div className="flex justify-center my-2 text-muted-foreground/80 font-bold">│</div>
                          <div className="flex flex-wrap justify-center gap-8 pt-1">
                            {directReports.map(mgr => {
                              const subReports = reportsOf(mgr.id);
                              return (
                                <div key={mgr.id} className="flex flex-col items-center">
                                  <div className="bg-[#1b4d3e] text-white px-4 py-2 rounded-md border border-emerald-800 shadow-md text-center w-[220px]">
                                    <div className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-300">{mgr.employmentType} • {mgr.employeeCode}</div>
                                    <div className="font-bold text-xs">{mgr.name}</div>
                                    <div className="text-[9px] opacity-75 mt-0.5">{mgr.department || mgr.email}</div>
                                  </div>

                                  {subReports.length > 0 && (
                                    <>
                                      <div className="text-muted-foreground/80 font-bold mt-2">│</div>
                                      <div className="flex flex-wrap justify-center gap-2 mt-1 max-w-[420px]">
                                        {subReports.map(sub => (
                                          <div key={sub.id} className="bg-card border-2 border-border border-dashed text-foreground px-3 py-1.5 rounded-md shadow-xs text-center min-w-[120px] hover:border-black transition-all">
                                            <div className="font-bold text-[8px] uppercase tracking-wider text-emerald-600">{sub.employmentType}</div>
                                            <div className="font-extrabold text-[10px] text-primary">{sub.name}</div>
                                            <div className="text-[8px] text-muted-foreground mt-0.5">{getDojLength(sub.dateOfJoining)}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {partners.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-8">No partners found in the employee directory.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Leave Approvals */}
          {hrActiveTab === "leaves" && (
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/60 uppercase text-muted-foreground font-bold border-b">
                    <tr>
                      <th className="px-4 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Role Code</th>
                      <th className="px-4 py-3.5">Type</th>
                      <th className="px-4 py-3.5">Dates</th>
                      <th className="px-4 py-3.5">Duration</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {leaves.map(req => {
                      const startDate = new Date(req.startDate);
                      const endDate = new Date(req.endDate);
                      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

                      return (
                        <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-4 font-bold text-foreground">{req.user?.name || "—"}</td>
                          <td className="px-4 py-4 font-mono text-muted-foreground">{req.user?.employeeCode || "—"}</td>
                          <td className="px-4 py-4 font-semibold">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px]",
                              req.type === "SICK" && "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950",
                              req.type === "CASUAL" && "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950",
                              req.type === "EARNED" && "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950"
                            )}>
                              {req.type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground font-medium">
                            {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="px-4 py-4 font-semibold">{totalDays} {totalDays === 1 ? "day" : "days"}</td>
                          <td className="px-4 py-4 max-w-xs truncate text-muted-foreground font-normal" title={req.reason}>
                            {req.reason}
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                              req.status === "PENDING" && "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900",
                              req.status === "APPROVED" && "bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900",
                              req.status === "REJECTED" && "bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900"
                            )}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleLeaveStatusChange(req.id, "REJECTED")}
                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                                  title="Reject Leave"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleLeaveStatusChange(req.id, "APPROVED")}
                                  className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition-colors"
                                  title="Approve Leave"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">Decision logged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {leaves.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No leave requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: HR Admin Timesheets Queue */}
          {hrActiveTab === "timesheets" && (
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-sm font-bold text-foreground">📥 Staff Timesheet Approvals</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Approve or reject submitted weekly billable timesheets from staff articles and assistants.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/60 uppercase text-muted-foreground font-bold border-b">
                    <tr>
                      <th className="px-4 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Task Description</th>
                      <th className="px-4 py-3.5">Client Target</th>
                      <th className="px-4 py-3.5 text-center">Hours</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {timesheets.filter(t => t.status === "PENDING").map(ts => (
                      <tr key={ts.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4 font-bold text-foreground">{ts.user?.name || "—"}</td>
                        <td className="px-4 py-4 text-muted-foreground">{fmtDate(ts.date)}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{ts.taskTitle}</div>
                          <div className="text-[10px] text-muted-foreground italic truncate max-w-xs">{ts.description}</div>
                        </td>
                        <td className="px-4 py-4 font-mono text-muted-foreground">{ts.clientName || "—"}</td>
                        <td className="px-4 py-4 text-center font-bold font-mono">{ts.hours.toFixed(2)}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            {ts.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTimesheetStatusChange(ts.id, "REJECTED")}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTimesheetStatusChange(ts.id, "APPROVED")}
                              className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {timesheets.filter(t => t.status === "PENDING").length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground font-semibold">
                          No pending timesheet approvals in this queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      ) : (

        // 3. EMPLOYEE PORTAL WORKSPACE (Article / Clerk / Manager Self-Service)
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Tabs */}
          <div className="flex border-b border-border/80">
            {([
              { key: "profile", icon: Users, label: "My Workplace Profile & Lineage" },
              { key: "leaves", icon: Calendar, label: "Apply Leave & History" },
              { key: "timesheets", icon: Clock, label: "My Daily Timesheets" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setEmployeeActiveTab(tab.key)}
                className={cn(
                  "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                  employeeActiveTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {employeeActiveTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Personal Block card & Milestones */}
              <div className="lg:col-span-1 space-y-6">

                {/* 1. Profile Badge */}
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black text-white font-extrabold flex items-center justify-center rounded-xl text-lg border border-zinc-700 shadow font-mono">
                      {(me?.name || "??").split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{me?.name || "Loading..."}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase font-bold tracking-wider mt-0.5">
                        {me?.employeeCode || "—"} • {me?.employmentType || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-semibold text-foreground">{me?.department || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joining Date:</span>
                      <span className="font-semibold text-foreground">{fmtDate(me?.dateOfJoining)}</span>
                    </div>
                    {me?.icaiRegNo && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ICAI Registration:</span>
                        <span className="font-mono font-semibold text-primary">{me.icaiRegNo}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-bold text-green-600 uppercase tracking-wider text-[9px]">
                        {me?.isActive ? "Active Duties" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Milestone / Countdown Tracker widget (Articles only) */}
                {me?.employmentType === "Article Assistant" && articleProgress && (
                  <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ICAI compliance tracker</span>
                      <Clock className="w-4 h-4 text-[#1b4d3e]" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Articleship Time Elapsed</span>
                        <span className="font-bold text-primary">{articleProgress.served} Days ({articleProgress.pct}%)</span>
                      </div>

                      <div className="w-full h-3 bg-muted border rounded-full overflow-hidden p-0.5">
                        <div className="h-full bg-gradient-to-r from-[#1b4d3e] to-emerald-500 rounded-full" style={{ width: `${articleProgress.pct}%` }}></div>
                      </div>

                      <div className="flex justify-between text-[9px] text-muted-foreground font-semibold mt-1">
                        <span>Term Started: {fmtDate(articleProgress.start.toISOString())}</span>
                        <span>Target: {fmtDate(articleProgress.end.toISOString())} (2 Years)</span>
                      </div>
                    </div>

                    <div className="border-t pt-3 mt-2 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Days Served:</span>
                        <span className="font-bold text-foreground">{articleProgress.served} Days</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Days Remaining:</span>
                        <span className="font-bold text-foreground">{articleProgress.remaining} Days</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Leaves Taken / Allowed:</span>
                        <span className="font-extrabold text-foreground">{me?.leavesTaken ?? 0} / {me?.totalLeavesAllowed ?? 24} days allowed</span>
                      </div>

                      <div className="bg-[#1b4d3e]/5 dark:bg-emerald-950/20 border border-[#1b4d3e]/10 p-2.5 rounded-lg text-[9px] text-[#1b4d3e] dark:text-emerald-400 font-semibold mt-2">
                        ⚠️ <span className="font-bold">ICAI Regulatory Note:</span> Under the New Scheme (effective July 1, 2023), the articleship duration is 2 years. Permissible leave is strictly 12 days per year (total 24 days). Any excess leaves taken will result in an articleship term extension!
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Visual Block Lineage diagram */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">🌐 My Lineage / Reporting Chain</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Visualizing your immediate reporting hierarchy and coworkers inside the firm.
                    </p>
                  </div>

                  <div className="font-mono text-[11px] text-foreground bg-muted/20 border rounded-xl p-6 shadow-inner space-y-2">

                    {/* HOD Partner Block */}
                    {me?.hodPartner && me.hodPartner !== "Self" && (
                      <div className="flex flex-col items-center">
                        <div className="border border-zinc-700 bg-black text-white px-4 py-2 rounded shadow-xs w-full max-w-[220px] text-center">
                          <div className="font-extrabold text-[8px] uppercase text-emerald-400">Department Head / Partner</div>
                          <div className="font-bold text-xs">{me.hodPartner}</div>
                          <div className="text-[8px] opacity-75">Partner-in-Charge</div>
                        </div>
                        <div className="text-muted-foreground/80 font-bold">│</div>
                        <div className="text-muted-foreground/80 font-bold">▼</div>
                      </div>
                    )}

                    {/* Supervisor Block */}
                    {mySupervisor && (
                      <div className="flex flex-col items-center">
                        <div className="border border-emerald-800 bg-[#1b4d3e] text-white px-4 py-2 rounded shadow-xs w-full max-w-[220px] text-center">
                          <div className="font-extrabold text-[8px] uppercase text-emerald-300">My Supervisor</div>
                          <div className="font-bold text-xs">{mySupervisor.name}</div>
                          <div className="text-[8px] opacity-75">{mySupervisor.employmentType} • {mySupervisor.department}</div>
                        </div>
                        <div className="text-muted-foreground/80 font-bold">│</div>
                        <div className="text-muted-foreground/80 font-bold">▼</div>
                      </div>
                    )}

                    {/* YOU highlighted */}
                    <div className="flex flex-col items-center">
                      <div className="border-2 border-black bg-white dark:bg-zinc-800 text-black dark:text-white px-5 py-2.5 rounded shadow w-full max-w-[240px] text-center font-bold">
                        <div className="font-extrabold text-[9px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 animate-pulse">★ YOU (Highlighted) ★</div>
                        <div className="font-extrabold text-xs">{me?.name || "—"}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{me?.employmentType} ({me?.department})</div>
                      </div>

                      {/* Peers or reportees row */}
                      {(myReports.length > 0 ? myReports : myPeers).length > 0 && (
                        <>
                          <div className="text-muted-foreground/80 font-bold mt-2">│</div>
                          <div className="text-muted-foreground/80 font-bold">┌────────────────────────┴────────────────────────┐</div>
                          <div className="flex flex-wrap justify-center gap-4 mt-1.5 w-full">
                            {(myReports.length > 0 ? myReports : myPeers).slice(0, 6).map(p => (
                              <div key={p.id} className="bg-card border border-border px-3 py-1.5 rounded shadow-xs text-center flex-1 max-w-[170px] min-w-[130px]">
                                <div className="font-bold text-[8px] uppercase text-emerald-600 tracking-wider">
                                  {myReports.length > 0 ? "Reportee" : "Co-worker"}
                                </div>
                                <div className="font-bold text-[10px] text-foreground">{p.name}</div>
                                <div className="text-[8px] text-muted-foreground mt-0.5">{p.dateOfJoining ? `Joined ${fmtDate(p.dateOfJoining)}` : p.employmentType}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              </div>

            </div>
          )}

          {employeeActiveTab === "leaves" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Apply Leave Form */}
              <div className="lg:col-span-1">
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">📅 Submit Leave Application</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your request will be routed directly to your supervisor{mySupervisor ? ` (${mySupervisor.name})` : ""} for processing.
                    </p>
                  </div>

                  <form onSubmit={handleApplyLeave} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Start Date *</label>
                        <input type="date" name="startDate" required className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">End Date *</label>
                        <input type="date" name="endDate" required className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Leave Category *</label>
                      <select name="leaveType" required className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer">
                        <option value="SICK">Sick Leave (Medical Emergency)</option>
                        <option value="CASUAL">Casual Leave (Personal Work)</option>
                        <option value="EARNED">Earned Leave (Authorized Vacation)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Reason & Remarks *</label>
                      <textarea
                        name="reason"
                        required
                        rows={3}
                        placeholder="Detail the circumstances of your absence..."
                        className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1b4d3e] text-white hover:bg-emerald-950 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      File Application
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: History of leaves */}
              <div className="lg:col-span-2">
                <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col h-full">

                  <div className="p-4 border-b">
                    <h3 className="text-sm font-bold text-foreground">📅 My Leave Request History</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Tracking status approvals of filed leave log sheets.</p>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/60 uppercase text-muted-foreground font-bold border-b">
                        <tr>
                          <th className="px-4 py-3.5">Category</th>
                          <th className="px-4 py-3.5">Duration Dates</th>
                          <th className="px-4 py-3.5">Days</th>
                          <th className="px-4 py-3.5">Reason Notes</th>
                          <th className="px-4 py-3.5">Approval Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {leaves.filter(l => me && l.userId === me.id).map(req => {
                          const startDate = new Date(req.startDate);
                          const endDate = new Date(req.endDate);
                          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

                          return (
                            <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3.5">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                  req.type === "SICK" && "bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950",
                                  req.type === "CASUAL" && "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950",
                                  req.type === "EARNED" && "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950"
                                )}>
                                  {req.type}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-medium text-muted-foreground">
                                {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </td>
                              <td className="px-4 py-3.5 font-bold">{totalDays} {totalDays === 1 ? "day" : "days"}</td>
                              <td className="px-4 py-3.5 text-muted-foreground truncate max-w-xs">{req.reason}</td>
                              <td className="px-4 py-3.5">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                                  req.status === "PENDING" && "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900",
                                  req.status === "APPROVED" && "bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900",
                                  req.status === "REJECTED" && "bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900"
                                )}>
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {leaves.filter(l => me && l.userId === me.id).length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                              No leave applications logged.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Employee Timesheet Self-Service Workspace */}
          {employeeActiveTab === "timesheets" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Manual Log Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">✍️ Log Manual Work Entry</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Submit manual workcards if stopwatch timers were missed.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Task Title *</label>
                      <input
                        type="text"
                        value={manualTaskTitle}
                        onChange={(e) => setManualTaskTitle(e.target.value)}
                        placeholder="e.g. Statutory Audit Review"
                        className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Client Target *</label>
                      <input
                        type="text"
                        value={manualClientName}
                        onChange={(e) => setManualClientName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Hours Logged *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={manualHours}
                        onChange={(e) => setManualHours(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:outline-none font-semibold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Comments & Notes *</label>
                      <textarea
                        rows={3}
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        placeholder="Describe exact SOP steps executed..."
                        className="w-full p-2 border rounded-lg text-xs bg-background text-foreground focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleManualLog}
                      className="w-full py-2.5 bg-[#1b4d3e] text-white hover:bg-emerald-950 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      Save to Drafts
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: List of timesheets */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                  <div className="p-4 border-b flex justify-between items-center bg-card">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">📋 Daily Timesheet Logbook</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Manage timesheet draft edits and check submitted statuses.</p>
                    </div>
                    {timesheets.filter(t => me && t.userId === me.id && t.status === "DRAFT").length > 0 && (
                      <button
                        type="button"
                        onClick={handleSubmitAllDrafts}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold uppercase transition-all shadow"
                      >
                        🚀 Submit All Drafts
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/60 uppercase text-muted-foreground font-bold border-b">
                        <tr>
                          <th className="px-4 py-3.5">Date</th>
                          <th className="px-4 py-3.5">Task Description</th>
                          <th className="px-4 py-3.5">Client Target</th>
                          <th className="px-4 py-3.5 text-center">Hours</th>
                          <th className="px-4 py-3.5">Approval Status</th>
                          <th className="px-4 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {timesheets.filter(t => me && t.userId === me.id).map(ts => {
                          const isEditing = editingTimesheetId === ts.id;
                          return (
                            <tr key={ts.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-4 text-muted-foreground font-semibold font-mono">{fmtDate(ts.date)}</td>
                              <td className="px-4 py-4 max-w-xs">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingDesc}
                                    onChange={(e) => setEditingDesc(e.target.value)}
                                    className="p-1 border rounded w-full text-xs bg-background text-foreground"
                                  />
                                ) : (
                                  <div>
                                    <div className="font-semibold text-foreground">{ts.taskTitle}</div>
                                    <div className="text-[10px] text-muted-foreground italic truncate" title={ts.description || ""}>{ts.description}</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 font-mono font-medium text-muted-foreground">{ts.clientName || "—"}</td>
                              <td className="px-4 py-4 text-center font-mono">
                                {isEditing ? (
                                  ts.isManual ? (
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={editingHours}
                                      onChange={(e) => setEditingHours(parseFloat(e.target.value))}
                                      className="p-1 border rounded w-16 text-center text-xs font-mono bg-background text-foreground animate-in fade-in"
                                    />
                                  ) : (
                                    <span className="font-bold text-muted-foreground flex items-center justify-center gap-0.5 animate-in fade-in" title="Locked to stopwatch session duration">
                                      {ts.hours.toFixed(2)} 🔒
                                    </span>
                                  )
                                ) : (
                                  <span className="font-bold text-foreground">{ts.hours.toFixed(2)}</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border",
                                  ts.status === "DRAFT" && "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-950/20 dark:text-zinc-400 dark:border-zinc-950",
                                  ts.status === "PENDING" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950",
                                  ts.status === "APPROVED" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-950",
                                  ts.status === "REJECTED" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950"
                                )}>
                                  {ts.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                {ts.status === "DRAFT" && (
                                  <div className="flex justify-end gap-1.5">
                                    {isEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setEditingTimesheetId(null)}
                                          className="px-2 py-1 border rounded bg-muted hover:bg-muted/80 text-[10px] font-bold uppercase"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveTimesheetEdit(ts.id)}
                                          className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold uppercase shadow"
                                        >
                                          Save
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingTimesheetId(ts.id);
                                          setEditingHours(ts.hours);
                                          setEditingDesc(ts.description || "");
                                        }}
                                        className="px-2.5 py-1 border border-[#1b4d3e]/20 text-[#1b4d3e] dark:text-emerald-400 hover:bg-[#1b4d3e]/5 rounded text-[10px] font-bold uppercase"
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {timesheets.filter(t => me && t.userId === me.id).length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground font-semibold">
                              No logged timecards found. Work on tasks in Tasks checklist timer or log manual work entry to populate.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* --- SLIDEOVERS / DRAWERS --- */}

      {/* SlideOver A: Add Candidate Modal */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-card border-l h-full flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1">
                <UserPlus className="w-5 h-5 text-[#1b4d3e]" />
                Add New Candidate
              </h2>
              <button onClick={() => setIsCandidateModalOpen(false)} className="text-muted-foreground hover:text-foreground font-semibold text-sm">Close</button>
            </div>

            <form onSubmit={handleAddCandidate} className="space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Full Name *</label>
                <input name="name" required placeholder="e.g. Ramesh Kumar" className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                  <input type="email" name="email" required placeholder="ramesh@gmail.com" className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Mobile Number *</label>
                  <input name="phone" required placeholder="+91 99887 76655" className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Proposed Position *</label>
                  <select name="position" required className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer">
                    <option value="Article Assistant">Article Assistant</option>
                    <option value="Paid Assistant">Paid Assistant</option>
                    <option value="Qualified CA">Qualified CA</option>
                    <option value="Manager">Manager / Squad Lead</option>
                    <option value="Admin / Support">Admin / Support Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Department *</label>
                  <select name="department" required className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer">
                    {(departments.length > 0 ? departments : ["Audit & Assurance", "Tax & Legal Advisory", "Consulting / Advisory", "Financial Advisory / Deals"]).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Recruitment Notes & Screening Remarks</label>
                <textarea name="notes" rows={3} placeholder="Initial CV screening highlights, qualification details, standard expectance criteria..." className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none" />
              </div>

              <div className="pt-6 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsCandidateModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors uppercase">Add Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SlideOver B: Add / Onboard Employee Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-card border-l h-full flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                <UserCheck className="w-5 h-5 text-[#1b4d3e]" />
                {selectedCandidateForHiring ? "Convert Candidate to Active Employee" : "Onboard New Employee"}
              </h2>
              <button
                onClick={() => { setIsEmployeeModalOpen(false); setSelectedCandidateForHiring(null); }}
                className="text-muted-foreground hover:text-foreground font-semibold text-sm"
              >
                Close
              </button>
            </div>

            {selectedCandidateForHiring && (
              <div className="bg-[#1b4d3e]/5 dark:bg-emerald-950/20 border border-[#1b4d3e]/20 p-3 rounded-lg text-xs text-foreground mb-4 space-y-1">
                <div><span className="font-bold">Candidate Selected:</span> {selectedCandidateForHiring.name}</div>
                <div><span className="font-bold">Applied For:</span> {selectedCandidateForHiring.position} ({selectedCandidateForHiring.department})</div>
                <div className="text-[10px] text-muted-foreground italic">System will automatically advance pipeline state to Hired once successfully onboarded!</div>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-6 flex-1">

              {/* SECTION 1: Professional & Firm Details */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">💼 Professional & Firm Details</div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Full Name *</label>
                    <input
                      name="name"
                      required
                      defaultValue={selectedCandidateForHiring?.name || ""}
                      placeholder="e.g. Anand Sharma"
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={selectedCandidateForHiring?.email || ""}
                      placeholder="anand@prabandh.in"
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Employee ID / Code *</label>
                    <input
                      name="empId"
                      required
                      placeholder="e.g. EMP008 or ART2026-05"
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Employment Type *</label>
                    <select
                      name="employment_type"
                      required
                      defaultValue={selectedCandidateForHiring?.position || "Article Assistant"}
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                    >
                      <option value="Article Assistant">Article Assistant</option>
                      <option value="Paid Assistant">Paid Assistant</option>
                      <option value="Qualified CA">Qualified CA</option>
                      <option value="Manager">Manager / Senior Manager</option>
                      <option value="Partner">Partner / Director</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Date of Joining (DOJ) *</label>
                    <input
                      type="date"
                      name="date_of_joining"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Department / Squad *</label>
                    <select
                      name="department"
                      required
                      defaultValue={selectedCandidateForHiring?.department || departments[0] || "Audit & Assurance"}
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer font-semibold"
                    >
                      {(departments.length > 0 ? departments : ["Audit & Assurance", "Tax & Legal Advisory", "Consulting / Advisory", "Financial Advisory / Deals"]).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional Field: ICAI Registration Number */}
                <div className="bg-muted/40 p-3 rounded-lg border">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">ICAI Registration No (Articles Only)</label>
                  <input
                    name="icai_reg_no"
                    placeholder="e.g. ICAI/ART/112948"
                    className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1">Required strictly for Article Assistants to compute statutory milestone parameters.</p>
                </div>
              </div>

              {/* SECTION 2: Hierarchy & Reporting */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">🌐 Hierarchy & Reporting</div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Direct Supervisor (Reports To)</label>
                    <select
                      name="reporting_to"
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                    >
                      <option value="">None (Top Partner)</option>
                      {employees
                        .filter(e => e.employmentType === "Manager" || e.employmentType === "Partner")
                        .map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.employmentType}{e.department ? `, ${e.department}` : ""})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">HOD / Partner-in-Charge *</label>
                    <select
                      name="hod_partner"
                      required
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                    >
                      {partners.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      <option value="Self">Self (HOD)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => { setIsEmployeeModalOpen(false); setSelectedCandidateForHiring(null); }}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors uppercase font-bold tracking-wider"
                >
                  Onboard & Save
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SlideOver C: Rejected Candidates Drawer */}
      {isRejectedCandidatesDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-card border-l h-full flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300 font-sans">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                <XCircle className="w-5 h-5 text-red-500" />
                Archived & Rejected Candidates
              </h2>
              <button
                onClick={() => setIsRejectedCandidatesDrawerOpen(false)}
                className="text-muted-foreground hover:text-foreground font-semibold text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {candidates.filter(c => c.stage === "Rejected").map(c => (
                <div key={c.id} className="bg-red-50/10 dark:bg-red-950/10 border border-red-200/40 dark:border-red-950/50 rounded-xl p-4 flex flex-col justify-between h-[155px]">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{c.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-semibold leading-none mt-0.5">{c.position}</p>
                      </div>
                      <span className="text-[9px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-bold px-2 py-0.5 rounded uppercase">
                        Rejected
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground space-y-1">
                      <div><span className="font-semibold text-foreground/80">Department:</span> {c.department}</div>
                      <div><span className="font-semibold text-foreground/80">Email:</span> {c.email}</div>
                      {c.notes && <div className="italic text-[10px] mt-1.5 leading-tight text-muted-foreground/80">&ldquo;{c.notes}&rdquo;</div>}
                    </div>
                  </div>

                  <div className="flex justify-end mt-3 pt-2 border-t border-red-200/20">
                    <button
                      onClick={() => handleRestoreCandidate(c.id)}
                      className="flex items-center gap-1 text-[9px] text-[#1b4d3e] hover:text-emerald-950 dark:text-emerald-400 font-extrabold uppercase transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      Restore Candidate
                    </button>
                  </div>
                </div>
              ))}

              {candidates.filter(c => c.stage === "Rejected").length === 0 && (
                <div className="h-48 border border-dashed border-border rounded-xl flex flex-col items-center justify-center p-4">
                  <XCircle className="w-8 h-8 text-muted-foreground/60 mb-2" />
                  <span className="text-xs text-muted-foreground text-center">No rejected candidates archived.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
