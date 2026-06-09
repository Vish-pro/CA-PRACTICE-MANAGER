"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Calendar, FileText, CheckCircle, XCircle, 
  Search, Filter, Plus, ArrowRight, UserCheck, ShieldAlert, 
  Award, Clock, ChevronRight, UserCog, Briefcase, GitPullRequest, ArrowDown
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

// --- Types & Interfaces ---
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  stage: "Applied" | "Interviewing" | "Offer" | "Onboarding" | "Hired" | "Rejected";
  appliedDate: string;
  notes?: string;
}

interface Employee {
  id: string;
  employee_id: string; // ID/Code e.g., EMP001
  name: string;
  email: string;
  employment_type: "Article Assistant" | "Paid Assistant" | "Qualified CA" | "Manager" | "Partner";
  department: string;
  date_of_joining: string;
  reporting_to: string; // Employee ID or name of supervisor
  hod_partner: string;  // Name of HOD Partner
  icai_reg_no?: string; // Optional (mandatory only for Articles)
  totalLeavesAllowed?: number;
  leavesTaken?: number;
  isActive: boolean;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: "SICK" | "CASUAL" | "EARNED";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

// --- Dynamic Mock Initial Seeds ---
const defaultCandidates: Candidate[] = [
  { id: "cand-1", name: "Rahul Sharma", email: "rahul.sharma@outlook.com", phone: "+91 98765 43210", position: "Paid Assistant", department: "Direct Tax & ITR", stage: "Applied", appliedDate: "2026-05-10", notes: "Strong grip on corporate returns filing." },
  { id: "cand-2", name: "Priya Patel", email: "priya.patel@gmail.com", phone: "+91 98123 45678", position: "Article Assistant", department: "Indirect Tax (GST)", stage: "Interviewing", appliedDate: "2026-05-15", notes: "Cleared both groups of IPCC in first attempt." },
  { id: "cand-3", name: "Amit Mehta", email: "amit.mehta@yahoo.com", phone: "+91 98761 23456", position: "Qualified CA", department: "Statutory Audit", stage: "Offer", appliedDate: "2026-05-02", notes: "3 years post-qualification experience in Big 4." },
  { id: "cand-4", name: "Sneha Reddy", email: "sneha.reddy@gmail.com", phone: "+91 98654 32109", position: "Article Assistant", department: "Corporate Law (MCA)", stage: "Onboarding", appliedDate: "2026-05-05", notes: "Highly enthusiastic, waiting for articleship registration." }
];

const defaultEmployees: Employee[] = [
  { id: "emp-1", employee_id: "PAR001", name: "Vikramaditya Rao", email: "vikram@prabandh.com", employment_type: "Partner", department: "Statutory Audit", date_of_joining: "2020-01-01", reporting_to: "None", hod_partner: "Self", isActive: true },
  { id: "emp-2", employee_id: "MGR002", name: "Neha Gupta", email: "neha.gupta@prabandh.com", employment_type: "Manager", department: "Indirect Tax (GST)", date_of_joining: "2021-06-15", reporting_to: "PAR001", hod_partner: "Vikramaditya Rao", isActive: true },
  { id: "emp-3", employee_id: "MGR003", name: "Rajesh Iyer", email: "rajesh.iyer@prabandh.com", employment_type: "Manager", department: "Direct Tax & ITR", date_of_joining: "2022-09-01", reporting_to: "PAR001", hod_partner: "Vikramaditya Rao", isActive: true },
  { id: "emp-4", employee_id: "EMP004", name: "Aditya Verma", email: "aditya.v@prabandh.com", employment_type: "Paid Assistant", department: "Direct Tax & ITR", date_of_joining: "2023-11-01", reporting_to: "Rajesh Iyer", hod_partner: "Vikramaditya Rao", isActive: true },
  { id: "emp-5", employee_id: "ART2025-01", name: "Kunal Sen", email: "kunal.sen@prabandh.com", employment_type: "Article Assistant", department: "Indirect Tax (GST)", date_of_joining: "2025-05-26", reporting_to: "Neha Gupta", hod_partner: "Vikramaditya Rao", icai_reg_no: "ICAI/ART/109823", totalLeavesAllowed: 24, leavesTaken: 12, isActive: true },
  { id: "emp-6", employee_id: "ART2025-02", name: "Meera Nair", email: "meera.nair@prabandh.com", employment_type: "Article Assistant", department: "Indirect Tax (GST)", date_of_joining: "2025-08-10", reporting_to: "Neha Gupta", hod_partner: "Vikramaditya Rao", icai_reg_no: "ICAI/ART/110294", totalLeavesAllowed: 24, leavesTaken: 8, isActive: true },
  { id: "emp-7", employee_id: "ART2025-03", name: "Aniket Joshi", email: "aniket.j@prabandh.com", employment_type: "Article Assistant", department: "Indirect Tax (GST)", date_of_joining: "2025-10-15", reporting_to: "Neha Gupta", hod_partner: "Vikramaditya Rao", icai_reg_no: "ICAI/ART/111093", totalLeavesAllowed: 24, leavesTaken: 14, isActive: true }
];

const defaultLeaves: LeaveRequest[] = [
  { id: "leave-1", employeeName: "Kunal Sen", employeeId: "ART2025-01", startDate: "2026-05-28", endDate: "2026-05-30", reason: "Severe viral fever, doctor advised bed rest", type: "SICK", status: "PENDING", createdAt: "2026-05-25" },
  { id: "leave-2", employeeName: "Meera Nair", employeeId: "ART2025-02", startDate: "2026-06-05", endDate: "2026-06-07", reason: "Attending elder brother's wedding in Kerala", type: "CASUAL", status: "APPROVED", createdAt: "2026-05-20" },
  { id: "leave-3", employeeName: "Aditya Verma", employeeId: "EMP004", startDate: "2026-06-12", endDate: "2026-06-20", reason: "Family trip to Shimla during summer recess", type: "EARNED", status: "APPROVED", createdAt: "2026-05-18" }
];

export default function HRMasterPage() {
  const [role, setRole] = useState<string>("CLERK");

  // Local Storage Database States
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

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

  const [dailyTimesheets, setDailyTimesheets] = useState<TimesheetLog[]>([]);
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

  let simulatedEmployeeId = "ART2025-01";
  let simulatedEmployeeName = "Kunal Sen";

  if (role === "MANAGER") {
    simulatedEmployeeId = "MGR002";
    simulatedEmployeeName = "Neha Gupta";
  } else if (role === "ADMIN" || role === "PARTNER" || role === "DIRECTOR") {
    simulatedEmployeeId = "PAR001";
    simulatedEmployeeName = "Vikramaditya Rao";
  } else if (role === "HR") {
    simulatedEmployeeId = "EMP003";
    simulatedEmployeeName = "HR Officer";
  }

  interface TimesheetLog {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;
    taskId: string;
    taskTitle: string;
    clientName: string;
    hours: number;
    description: string;
    status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
    isManual?: boolean;
  }

  // Mount logic & localStorage sync
  useEffect(() => {
    // 1. Role simulation syncing
    const checkRole = () => {
      const stored = localStorage.getItem("prabandh_simulated_role");
      if (stored) setRole(stored);
      else setRole("CLERK");
    };
    checkRole();
    window.addEventListener("storage", checkRole);
    window.addEventListener("role-change", checkRole as EventListener);

    // 2. Fetch and Seed Candidates
    const storedCandidates = localStorage.getItem("ca_candidate_pipeline");
    if (storedCandidates) {
      setCandidates(JSON.parse(storedCandidates));
    } else {
      setCandidates(defaultCandidates);
      localStorage.setItem("ca_candidate_pipeline", JSON.stringify(defaultCandidates));
    }

    // 3. Fetch and Seed Employees
    const storedEmployees = localStorage.getItem("ca_employee_directory");
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    } else {
      setEmployees(defaultEmployees);
      localStorage.setItem("ca_employee_directory", JSON.stringify(defaultEmployees));
    }

    // 4. Fetch and Seed Leaves
    const storedLeaves = localStorage.getItem("ca_leave_requests");
    if (storedLeaves) {
      setLeaves(JSON.parse(storedLeaves));
    } else {
      setLeaves(defaultLeaves);
      localStorage.setItem("ca_leave_requests", JSON.stringify(defaultLeaves));
    }

    // 5. Fetch and Seed Daily Timesheets
    const checkTimesheets = () => {
      const storedTS = localStorage.getItem("ca_daily_timesheets");
      if (storedTS) {
        setDailyTimesheets(JSON.parse(storedTS));
      } else {
        const initialTimesheets: TimesheetLog[] = [
          {
            id: "ts-kunal-1",
            employeeId: "ART2025-01",
            employeeName: "Kunal Sen",
            date: new Date().toISOString().split("T")[0],
            taskId: "task-kunal-1",
            taskTitle: "GST Return Filing",
            clientName: "Acme Corp",
            hours: 2.5,
            description: "Prepared and verified summary reports for October GST filings.",
            status: "PENDING",
            isManual: false
          },
          {
            id: "ts-meera-1",
            employeeId: "ART2025-02",
            employeeName: "Meera Nair",
            date: new Date().toISOString().split("T")[0],
            taskId: "task-meera-1",
            taskTitle: "ITR Auditing",
            clientName: "TechFlow Inc",
            hours: 3.2,
            description: "Conducted preliminary balance sheet audit checklist matching.",
            status: "APPROVED",
            isManual: false
          }
        ];
        setDailyTimesheets(initialTimesheets);
        localStorage.setItem("ca_daily_timesheets", JSON.stringify(initialTimesheets));
      }
    };
    checkTimesheets();
    window.addEventListener("storage", checkTimesheets);

    return () => {
      window.removeEventListener("storage", checkRole);
      window.removeEventListener("role-change", checkRole as EventListener);
      window.removeEventListener("storage", checkTimesheets);
    };
  }, [role]);

  const saveCandidates = (updated: Candidate[]) => {
    setCandidates(updated);
    localStorage.setItem("ca_candidate_pipeline", JSON.stringify(updated));
  };

  const saveEmployees = (updated: Employee[]) => {
    setEmployees(updated);
    localStorage.setItem("ca_employee_directory", JSON.stringify(updated));
  };

  const saveLeaves = (updated: LeaveRequest[]) => {
    setLeaves(updated);
    localStorage.setItem("ca_leave_requests", JSON.stringify(updated));
  };

  // --- Recruitment Flow Action Handlers ---
  const handleAddCandidate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    
    const newCand: Candidate = {
      id: Math.random().toString(36).substring(7),
      name: data.get("name") as string,
      email: data.get("email") as string,
      phone: data.get("phone") as string,
      position: data.get("position") as string,
      department: data.get("department") as string,
      stage: "Applied",
      appliedDate: new Date().toISOString().split("T")[0],
      notes: data.get("notes") as string
    };

    const updated = [...candidates, newCand];
    saveCandidates(updated);
    setIsCandidateModalOpen(false);
    toast.success("New Candidate added to recruitment pipeline!");
  };

  const handleAdvanceCandidate = (id: string) => {
    const cand = candidates.find(c => c.id === id);
    if (!cand) return;

    const stages: Candidate["stage"][] = ["Applied", "Interviewing", "Offer", "Onboarding", "Hired"];
    const currentIndex = stages.indexOf(cand.stage);
    
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      
      if (nextStage === "Hired") {
        // Trigger conversion flow
        setSelectedCandidateForHiring(cand);
        setIsEmployeeModalOpen(true);
      } else {
        const updated = candidates.map(c => c.id === id ? { ...c, stage: nextStage } : c);
        saveCandidates(updated);
        toast.success(`Candidate '${cand.name}' advanced to stage '${nextStage}'`);
      }
    }
  };

  const handleRejectCandidate = (id: string) => {
    if (!confirm("Are you sure you want to reject this candidate? This will archive their card.")) return;
    const updated = candidates.map(c => c.id === id ? { ...c, stage: "Rejected" as const } : c);
    saveCandidates(updated);
    toast.success("Candidate marked as rejected.");
  };

  const handleRestoreCandidate = (id: string) => {
    const updated = candidates.map(c => c.id === id ? { ...c, stage: "Applied" as const } : c);
    saveCandidates(updated);
    toast.success("Candidate restored back to Applied stage!");
  };

  const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    
    const name = data.get("name") as string;
    const email = data.get("email") as string;
    const empId = data.get("empId") as string;
    const empType = data.get("employment_type") as Employee["employment_type"];
    const dept = data.get("department") as string;
    const supervisor = data.get("reporting_to") as string;
    const hod = data.get("hod_partner") as string;
    const regNo = data.get("icai_reg_no") as string;

    const newEmp: Employee = {
      id: Math.random().toString(36).substring(7),
      employee_id: empId,
      name,
      email,
      employment_type: empType,
      department: dept,
      date_of_joining: data.get("date_of_joining") as string || new Date().toISOString().split("T")[0],
      reporting_to: supervisor,
      hod_partner: hod,
      icai_reg_no: empType === "Article Assistant" ? regNo : undefined,
      totalLeavesAllowed: empType === "Article Assistant" ? 24 : 30,
      leavesTaken: 0,
      isActive: true
    };

    const updatedEmps = [...employees, newEmp];
    saveEmployees(updatedEmps);

    // If this was converted from a candidate pipeline:
    if (selectedCandidateForHiring) {
      const updatedCands = candidates.map(c => c.id === selectedCandidateForHiring.id ? { ...c, stage: "Hired" as const } : c);
      saveCandidates(updatedCands);
      setSelectedCandidateForHiring(null);
    }

    setIsEmployeeModalOpen(false);
    form.reset();
    toast.success(`🎉 ${name} successfully onboarded as a new active team member!`);
  };

  // --- Leave Requests Action Handlers ---
  const handleLeaveStatusChange = (id: string, newStatus: "APPROVED" | "REJECTED") => {
    const updated = leaves.map(req => {
      if (req.id === id) {
        // If approved, dynamically update leaves taken count in employee directory
        if (newStatus === "APPROVED" && req.status !== "APPROVED") {
          const leaveDays = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 3600 * 24)) + 1;
          const matchedEmp = employees.find(e => e.employee_id === req.employeeId);
          if (matchedEmp) {
            const updatedEmps = employees.map(e => e.employee_id === req.employeeId 
              ? { ...e, leavesTaken: (e.leavesTaken || 0) + leaveDays } 
              : e
            );
            saveEmployees(updatedEmps);
          }
        }
        return { ...req, status: newStatus };
      }
      return req;
    });
    saveLeaves(updated);
    toast.success(`Leave request successfully ${newStatus.toLowerCase()}!`);
  };

  const handleApplyLeave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    const start = data.get("startDate") as string;
    const end = data.get("endDate") as string;
    const lType = data.get("leaveType") as LeaveRequest["type"];
    const reason = data.get("reason") as string;

    const newLeave: LeaveRequest = {
      id: Math.random().toString(36).substring(7),
      employeeName: simulatedEmployeeName,
      employeeId: simulatedEmployeeId,
      startDate: start,
      endDate: end,
      type: lType,
      reason,
      status: "PENDING",
      createdAt: new Date().toISOString().split("T")[0]
    };

    const updated = [...leaves, newLeave];
    saveLeaves(updated);
    form.reset();
    toast.success("Leave application submitted successfully for senior/supervisor approval!");
  };

  // --- Search & Filters ---
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === "All" || c.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.employment_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === "All" || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Calculate DOJ served length e.g. "8 months ago"
  const getDojLength = (dateStr: string) => {
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

  // --- Dynamic Dashboard rendering by Simulated Role ---
  const isHRAdmin = role === "HR" || role === "ADMIN" || role === "PARTNER" || role === "DIRECTOR";

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
                <h3 className="text-2xl font-bold tracking-tight mt-1">{employees.length}</h3>
              </div>
              <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Article Assistants</span>
                <h3 className="text-2xl font-bold tracking-tight mt-1">
                  {employees.filter(e => e.employment_type === "Article Assistant").length}
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
                  {candidates.filter(c => c.stage !== "Hired").length}
                </h3>
              </div>
              <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
                <GitPullRequest className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* B. Navigation Tabs */}
          <div className="flex border-b border-border/80">
            <button
              onClick={() => setHrActiveTab("pipeline")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                hrActiveTab === "pipeline" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <GitPullRequest className="w-4 h-4" />
              Recruitment Pipeline
            </button>
            <button
              onClick={() => setHrActiveTab("directory")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                hrActiveTab === "directory" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              Employee Directory
            </button>
            <button
              onClick={() => setHrActiveTab("orgtree")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                hrActiveTab === "orgtree" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Award className="w-4 h-4" />
              Org Structure (Tree)
            </button>
            <button
              onClick={() => setHrActiveTab("leaves")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                hrActiveTab === "leaves" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-4 h-4" />
              Leave Approvals
            </button>
            <button
              onClick={() => setHrActiveTab("timesheets")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                hrActiveTab === "timesheets" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="w-4 h-4" />
              Subordinate Timesheets
            </button>
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
                  <option value="Statutory Audit">Statutory Audit</option>
                  <option value="Indirect Tax (GST)">Indirect Tax (GST)</option>
                  <option value="Direct Tax & ITR">Direct Tax & ITR</option>
                  <option value="Corporate Law (MCA)">Corporate Law (MCA)</option>
                  <option value="HR & Internal Accounts">HR & Internal Accounts</option>
                </select>
              </div>
            </div>
          )}

          {/* D. Dynamic Tabs Content View */}

          {/* Tab 1: Recruitment Pipeline */}
          {hrActiveTab === "pipeline" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
              
              {/* Columns for Applied -> Interviewing -> Offer -> Onboarding -> Hired */}
              {(["Applied", "Interviewing", "Offer", "Onboarding", "Hired"] as const).map(stage => {
                const stageCandidates = filteredCandidates.filter(c => c.stage === stage);
                
                return (
                  <div key={stage} className="bg-muted/30 border border-border/80 rounded-xl p-3 min-w-[210px] flex flex-col h-[520px]">
                    
                    {/* Header of Column */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1b4d3e] dark:text-emerald-400">{stage}</span>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        {stageCandidates.length}
                      </span>
                    </div>

                    {/* Cards */}
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
                        <td className="px-4 py-4 font-mono font-bold text-primary">{emp.employee_id}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-[#1b4d3e] dark:text-emerald-400">{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground">{emp.email}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded font-semibold border",
                            emp.employment_type === "Partner" && "bg-black text-white border-black dark:bg-zinc-800 dark:border-zinc-700",
                            emp.employment_type === "Manager" && "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-950",
                            emp.employment_type === "Qualified CA" && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950",
                            emp.employment_type === "Article Assistant" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950",
                            emp.employment_type === "Paid Assistant" && "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                          )}>
                            {emp.employment_type}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold">{emp.department}</td>
                        <td className="px-4 py-4 text-muted-foreground font-medium">{emp.reporting_to}</td>
                        <td className="px-4 py-4 text-muted-foreground font-medium">{emp.hod_partner}</td>
                        <td className="px-4 py-4 font-mono text-muted-foreground">{emp.icai_reg_no || "—"}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 rounded font-bold uppercase tracking-wider text-[9px] border border-green-200 dark:border-green-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Active
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

          {/* Tab 3: Hierarchical Org Tree Diagram */}
          {hrActiveTab === "orgtree" && (
            <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center">
              <div className="text-center max-w-md mb-6">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Hierarchical Tree</span>
                <h3 className="text-lg font-bold mt-1">CA Firm Org Structure</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Visually mapping the lines of accountability from senior partners down to the article desk.</p>
              </div>

              {/* Minecraft block org-chart */}
              <div className="font-mono text-[11px] text-foreground border rounded-xl p-6 bg-muted/20 w-full max-w-3xl overflow-x-auto shadow-inner leading-relaxed">
                
                {/* PARTNER CARD */}
                <div className="flex justify-center">
                  <div className="bg-black text-white px-5 py-2.5 rounded-md border border-zinc-700 shadow-md text-center max-w-xs">
                    <div className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-400">Partner & Founder</div>
                    <div className="font-bold text-xs">Vikramaditya Rao, FCA</div>
                    <div className="text-[9px] opacity-75 mt-0.5">vikram@prabandh.com</div>
                  </div>
                </div>

                {/* LINE DOWN */}
                <div className="flex justify-center my-2 text-muted-foreground/80 font-bold">
                  │
                </div>

                {/* HORIZONTAL CONNECTOR BOX */}
                <div className="flex justify-center">
                  <span className="text-muted-foreground/80 font-bold">┌───────────────────────────────┴───────────────────────────────┐</span>
                </div>

                {/* SUPERVISOR CARDS */}
                <div className="flex justify-between gap-8 pt-2">
                  
                  {/* DIRECT TAX TEAM MANAGER */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="bg-[#1b4d3e] text-white px-4 py-2 rounded-md border border-emerald-800 shadow-md text-center w-full max-w-[220px]">
                      <div className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-300">HOD Direct Tax</div>
                      <div className="font-bold text-xs">Rajesh Iyer, CA</div>
                      <div className="text-[9px] opacity-75 mt-0.5">Head of Direct Tax & ITR</div>
                    </div>
                    <div className="text-muted-foreground/80 font-bold mt-2">│</div>
                    
                    {/* ADITYA SUBORDINATE */}
                    <div className="bg-card border-2 border-border border-dashed text-foreground px-3 py-2 rounded-md shadow-xs text-center w-full max-w-[200px] hover:border-black transition-all mt-1">
                      <div className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Paid Assistant</div>
                      <div className="font-bold text-xs text-[#1b4d3e]">Aditya Verma</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">DOJ: Nov 01, 2023</div>
                    </div>
                  </div>

                  {/* INDIRECT TAX (GST) TEAM MANAGER */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="bg-[#1b4d3e] text-white px-4 py-2 rounded-md border border-emerald-800 shadow-md text-center w-full max-w-[220px]">
                      <div className="font-extrabold uppercase text-[9px] tracking-wider text-emerald-300">HOD GST Dept</div>
                      <div className="font-bold text-xs">Neha Gupta, CA</div>
                      <div className="text-[9px] opacity-75 mt-0.5">Head of Indirect Tax & GST</div>
                    </div>
                    <div className="text-muted-foreground/80 font-bold mt-2">│</div>
                    <div className="text-muted-foreground/80 font-bold">┌───────────────────────┼───────────────────────┐</div>
                    
                    {/* ARTICLE SUBORDINATES */}
                    <div className="flex justify-between gap-2 mt-1 w-full">
                      
                      {/* Kunal */}
                      <div className="bg-card border-2 border-primary text-foreground px-2 py-1.5 rounded-md shadow-xs text-center flex-1 min-w-[95px] hover:shadow-sm transition-all">
                        <div className="font-bold text-[8px] uppercase text-emerald-600 tracking-wider">Article</div>
                        <div className="font-extrabold text-[10px] text-primary">Kunal Sen</div>
                        <div className="text-[8px] text-muted-foreground mt-0.5">{getDojLength("2025-05-26")}</div>
                      </div>

                      {/* Meera */}
                      <div className="bg-card border border-border text-foreground px-2 py-1.5 rounded-md shadow-xs text-center flex-1 min-w-[95px]">
                        <div className="font-bold text-[8px] uppercase text-emerald-600 tracking-wider">Article</div>
                        <div className="font-extrabold text-[10px] text-primary">Meera Nair</div>
                        <div className="text-[8px] text-muted-foreground mt-0.5">{getDojLength("2025-08-10")}</div>
                      </div>

                      {/* Aniket */}
                      <div className="bg-card border border-border text-foreground px-2 py-1.5 rounded-md shadow-xs text-center flex-1 min-w-[95px]">
                        <div className="font-bold text-[8px] uppercase text-emerald-600 tracking-wider">Article</div>
                        <div className="font-extrabold text-[10px] text-primary">Aniket Joshi</div>
                        <div className="text-[8px] text-muted-foreground mt-0.5">{getDojLength("2025-10-15")}</div>
                      </div>

                    </div>
                  </div>

                </div>

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
                          <td className="px-4 py-4 font-bold text-foreground">{req.employeeName}</td>
                          <td className="px-4 py-4 font-mono text-muted-foreground">{req.employeeId}</td>
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
                    {dailyTimesheets.filter(t => t.status === "PENDING").map(ts => (
                      <tr key={ts.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4 font-bold text-foreground">{ts.employeeName}</td>
                        <td className="px-4 py-4 text-muted-foreground">{ts.date}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{ts.taskTitle}</div>
                          <div className="text-[10px] text-muted-foreground italic truncate max-w-xs">{ts.description}</div>
                        </td>
                        <td className="px-4 py-4 font-mono text-muted-foreground">{ts.clientName}</td>
                        <td className="px-4 py-4 text-center font-bold font-mono">{ts.hours.toFixed(2)}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            {ts.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const updated = dailyTimesheets.map(t => t.id === ts.id ? { ...t, status: "REJECTED" as const } : t);
                                setDailyTimesheets(updated);
                                localStorage.setItem("ca_daily_timesheets", JSON.stringify(updated));
                                window.dispatchEvent(new Event("storage"));
                                toast.success("Timesheet log rejected.");
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const updated = dailyTimesheets.map(t => t.id === ts.id ? { ...t, status: "APPROVED" as const } : t);
                                setDailyTimesheets(updated);
                                localStorage.setItem("ca_daily_timesheets", JSON.stringify(updated));
                                window.dispatchEvent(new Event("storage"));
                                toast.success("Timesheet log approved successfully!");
                              }}
                              className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dailyTimesheets.filter(t => t.status === "PENDING").length === 0 && (
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
            <button
              onClick={() => setEmployeeActiveTab("profile")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                employeeActiveTab === "profile" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              My Workplace Profile & Lineage
            </button>
            <button
              onClick={() => setEmployeeActiveTab("leaves")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                employeeActiveTab === "leaves" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-4 h-4" />
              Apply Leave & History
            </button>
            <button
              onClick={() => setEmployeeActiveTab("timesheets")}
              className={cn(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all flex items-center gap-1.5",
                employeeActiveTab === "timesheets" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="w-4 h-4" />
              My Daily Timesheets
            </button>
          </div>

          {employeeActiveTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Personal Block card & Milestones */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* 1. Profile Badge */}
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black text-white font-extrabold flex items-center justify-center rounded-xl text-lg border border-zinc-700 shadow font-mono">
                      {role === "ARTICLE" ? "KS" : "NG"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {role === "ARTICLE" ? "Kunal Sen" : "Neha Gupta"}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase font-bold tracking-wider mt-0.5">
                        {role === "ARTICLE" ? "ART2025-01 • Article Assistant" : "MGR002 • Indirect Tax HOD"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-semibold text-foreground">Indirect Tax (GST)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joining Date:</span>
                      <span className="font-semibold text-foreground">May 26, 2025</span>
                    </div>
                    {role === "ARTICLE" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ICAI Registration:</span>
                        <span className="font-mono font-semibold text-primary">ICAI/ART/109823</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-bold text-green-600 uppercase tracking-wider text-[9px]">Active Duties</span>
                    </div>
                  </div>
                </div>

                {/* 2. Milestone / Countdown Tracker widget */}
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ICAI compliance tracker</span>
                    <Clock className="w-4 h-4 text-[#1b4d3e]" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Articleship Time Elapsed</span>
                      <span className="font-bold text-primary">365 Days / 1 Year</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-muted border rounded-full overflow-hidden p-0.5">
                      <div className="h-full bg-gradient-to-r from-[#1b4d3e] to-emerald-500 rounded-full" style={{ width: "50%" }}></div>
                    </div>
                    
                    <div className="flex justify-between text-[9px] text-muted-foreground font-semibold mt-1">
                      <span>Term Started: May 26, 2025</span>
                      <span>Target: May 26, 2027 (2 Years)</span>
                    </div>
                  </div>

                  <div className="border-t pt-3 mt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Days Served:</span>
                      <span className="font-bold text-foreground">365 Days</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Days Remaining:</span>
                      <span className="font-bold text-foreground">365 Days</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Leaves Taken / Allowed:</span>
                      <span className="font-extrabold text-foreground">12 / 24 days allowed</span>
                    </div>
                    
                    <div className="bg-[#1b4d3e]/5 dark:bg-emerald-950/20 border border-[#1b4d3e]/10 p-2.5 rounded-lg text-[9px] text-[#1b4d3e] dark:text-emerald-400 font-semibold mt-2">
                      ⚠️ <span className="font-bold">ICAI Regulatory Note:</span> Under the New Scheme (effective July 1, 2023), the articleship duration is 2 years. Permissible leave is strictly 12 days per year (total 24 days). Any excess leaves taken will result in an articleship term extension!
                    </div>
                  </div>
                </div>

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

                  {/* Minecraft style custom diagram */}
                  <div className="font-mono text-[11px] text-foreground bg-muted/20 border rounded-xl p-6 shadow-inner space-y-2">
                    
                    {/* HOD Partner Block */}
                    <div className="flex flex-col items-center">
                      <div className="border border-zinc-700 bg-black text-white px-4 py-2 rounded shadow-xs w-full max-w-[220px] text-center">
                        <div className="font-extrabold text-[8px] uppercase text-emerald-400">Department Head / Partner</div>
                        <div className="font-bold text-xs">Vikramaditya Rao, FCA</div>
                        <div className="text-[8px] opacity-75">Partner-in-Charge (Audit & Tax)</div>
                      </div>
                      <div className="text-muted-foreground/80 font-bold">│</div>
                      <div className="text-muted-foreground/80 font-bold">▼</div>
                    </div>

                    {/* Supervisor Manager Block */}
                    <div className="flex flex-col items-center">
                      <div className="border border-emerald-800 bg-[#1b4d3e] text-white px-4 py-2 rounded shadow-xs w-full max-w-[220px] text-center">
                        <div className="font-extrabold text-[8px] uppercase text-emerald-300">My Supervisor</div>
                        <div className="font-bold text-xs">Neha Gupta, CA</div>
                        <div className="text-[8px] opacity-75">Manager • GST & Indirect Tax</div>
                      </div>
                      <div className="text-muted-foreground/80 font-bold">│</div>
                      <div className="text-muted-foreground/80 font-bold">▼</div>
                    </div>

                    {/* Highlighted active employee Block */}
                    {role === "ARTICLE" ? (
                      <div className="flex flex-col items-center">
                        
                        {/* YOU highlighted in Black */}
                        <div className="border-2 border-black bg-white dark:bg-zinc-800 text-black dark:text-white px-5 py-2.5 rounded shadow w-full max-w-[240px] text-center font-bold">
                          <div className="font-extrabold text-[9px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 animate-pulse">★ YOU (Highlighted) ★</div>
                          <div className="font-extrabold text-xs">Kunal Sen</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">Article Assistant (GST)</div>
                        </div>

                        {/* Co-Articles list row */}
                        <div className="text-muted-foreground/80 font-bold mt-2">│</div>
                        <div className="text-muted-foreground/80 font-bold">┌────────────────────────┴────────────────────────┐</div>
                        
                        <div className="flex justify-center gap-4 mt-1.5 w-full">
                          
                          <div className="bg-card border border-border px-3 py-1.5 rounded shadow-xs text-center flex-1 max-w-[170px]">
                            <div className="font-bold text-[8px] uppercase text-emerald-600 tracking-wider">Co-Article</div>
                            <div className="font-bold text-[10px] text-foreground">Meera Nair</div>
                            <div className="text-[8px] text-muted-foreground mt-0.5">Joined Aug 10, 2025</div>
                          </div>

                          <div className="bg-card border border-border px-3 py-1.5 rounded shadow-xs text-center flex-1 max-w-[170px]">
                            <div className="font-bold text-[8px] uppercase text-emerald-600 tracking-wider">Co-Article</div>
                            <div className="font-bold text-[10px] text-foreground">Aniket Joshi</div>
                            <div className="text-[8px] text-muted-foreground mt-0.5">Joined Oct 15, 2025</div>
                          </div>

                        </div>

                      </div>
                    ) : (
                      // If role simulated is MANAGER (Neha Gupta View)
                      <div className="flex flex-col items-center">
                        
                        {/* YOU highlighted in Black */}
                        <div className="border-2 border-black bg-white dark:bg-zinc-800 text-black dark:text-white px-5 py-2.5 rounded shadow w-full max-w-[240px] text-center font-bold">
                          <div className="font-extrabold text-[9px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 animate-pulse">★ YOU (HOD) ★</div>
                          <div className="font-extrabold text-xs">Neha Gupta, CA</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">Manager (GST & Indirect Tax)</div>
                        </div>

                        {/* Subordinates articles list */}
                        <div className="text-muted-foreground/80 font-bold mt-2">│</div>
                        <div className="text-muted-foreground/80 font-bold">┌────────────────────────┼────────────────────────┐</div>
                        
                        <div className="flex justify-center gap-3 mt-1.5 w-full">
                          
                          <div className="bg-card border border-border px-2 py-1.5 rounded shadow-xs text-center flex-1 max-w-[120px]">
                            <div className="font-bold text-[8px] uppercase text-indigo-600 tracking-wider">Reportee</div>
                            <div className="font-bold text-[10px] text-foreground">Kunal Sen</div>
                            <div className="text-[8px] text-muted-foreground mt-0.5">Article Assistant</div>
                          </div>

                          <div className="bg-card border border-border px-2 py-1.5 rounded shadow-xs text-center flex-1 max-w-[120px]">
                            <div className="font-bold text-[8px] uppercase text-indigo-600 tracking-wider">Reportee</div>
                            <div className="font-bold text-[10px] text-foreground">Meera Nair</div>
                            <div className="text-[8px] text-muted-foreground mt-0.5">Article Assistant</div>
                          </div>

                          <div className="bg-card border border-border px-2 py-1.5 rounded shadow-xs text-center flex-1 max-w-[120px]">
                            <div className="font-bold text-[8px] uppercase text-indigo-600 tracking-wider">Reportee</div>
                            <div className="font-bold text-[10px] text-foreground">Aniket Joshi</div>
                            <div className="text-[8px] text-muted-foreground mt-0.5">Article Assistant</div>
                          </div>

                        </div>

                      </div>
                    )}

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
                      Your request will be routed directly to your supervisor (Neha Gupta) for processing.
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
                        {leaves.filter(l => l.employeeId === simulatedEmployeeId).map(req => {
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
                        {leaves.filter(l => l.employeeId === simulatedEmployeeId).length === 0 && (
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
                      onClick={() => {
                        if (!manualTaskTitle || !manualClientName) {
                          toast.error("Please fill required fields.");
                          return;
                        }
                        const newLog = {
                          id: Math.random().toString(36).substring(7),
                          employeeId: simulatedEmployeeId,
                          employeeName: simulatedEmployeeName,
                          date: new Date().toISOString().split("T")[0],
                          taskId: Math.random().toString(36).substring(5).toUpperCase(),
                          taskTitle: manualTaskTitle,
                          clientName: manualClientName,
                          hours: parseFloat(manualHours),
                          description: manualDesc,
                          status: "DRAFT" as const,
                          isManual: true
                        };
                        const updated = [...dailyTimesheets, newLog];
                        setDailyTimesheets(updated);
                        localStorage.setItem("ca_daily_timesheets", JSON.stringify(updated));
                        
                        setManualTaskTitle("");
                        setManualClientName("");
                        setManualHours("1.00");
                        setManualDesc("");
                        
                        window.dispatchEvent(new Event("storage"));
                        toast.success("Manual timesheet log saved in drafts!");
                      }}
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
                    {dailyTimesheets.filter(t => t.employeeId === simulatedEmployeeId && t.status === "DRAFT").length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = dailyTimesheets.map(t => 
                            (t.employeeId === simulatedEmployeeId && t.status === "DRAFT") 
                              ? { ...t, status: "PENDING" as const } 
                              : t
                          );
                          setDailyTimesheets(updated);
                          localStorage.setItem("ca_daily_timesheets", JSON.stringify(updated));
                          window.dispatchEvent(new Event("storage"));
                          toast.success("All drafts submitted successfully for supervisor approval!");
                        }}
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
                        {dailyTimesheets.filter(t => t.employeeId === simulatedEmployeeId).map(ts => {
                          const isEditing = editingTimesheetId === ts.id;
                          return (
                            <tr key={ts.id} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-4 text-muted-foreground font-semibold font-mono">{ts.date}</td>
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
                                    <div className="text-[10px] text-muted-foreground italic truncate" title={ts.description}>{ts.description}</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 font-mono font-medium text-muted-foreground">{ts.clientName}</td>
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
                                          onClick={() => {
                                            const updated = dailyTimesheets.map(t => 
                                              t.id === ts.id 
                                                ? { ...t, hours: editingHours, description: editingDesc } 
                                                : t
                                            );
                                            setDailyTimesheets(updated);
                                            localStorage.setItem("ca_daily_timesheets", JSON.stringify(updated));
                                            setEditingTimesheetId(null);
                                            window.dispatchEvent(new Event("storage"));
                                            toast.success("Timecard log updated successfully!");
                                          }}
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
                                          setEditingDesc(ts.description);
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
                        {dailyTimesheets.filter(t => t.employeeId === simulatedEmployeeId).length === 0 && (
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
                    <option value="Statutory Audit">Statutory Audit</option>
                    <option value="Indirect Tax (GST)">Indirect Tax (GST)</option>
                    <option value="Direct Tax & ITR">Direct Tax & ITR</option>
                    <option value="Corporate Law (MCA)">Corporate Law (MCA)</option>
                    <option value="HR & Internal Accounts">HR & Internal Accounts</option>
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
                      placeholder="anand@prabandh.com" 
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
                      defaultValue={selectedCandidateForHiring?.department || "Statutory Audit"}
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer font-semibold"
                    >
                      <option value="Statutory Audit">Statutory Audit</option>
                      <option value="Indirect Tax (GST)">Indirect Tax (GST)</option>
                      <option value="Direct Tax & ITR">Direct Tax & ITR</option>
                      <option value="Corporate Law (MCA)">Corporate Law (MCA)</option>
                      <option value="HR & Internal Accounts">HR & Internal Accounts</option>
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
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Direct Supervisor (Reports To) *</label>
                    <select 
                      name="reporting_to" 
                      required 
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                    >
                      <option value="None">None (Top Partner)</option>
                      <option value="Neha Gupta">Neha Gupta (Manager, GST)</option>
                      <option value="Rajesh Iyer">Rajesh Iyer (Manager, Direct Tax)</option>
                      <option value="Vikramaditya Rao">Vikramaditya Rao (Partner)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">HOD / Partner-in-Charge *</label>
                    <select 
                      name="hod_partner" 
                      required 
                      className="w-full p-2.5 border rounded-lg text-xs bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                    >
                      <option value="Vikramaditya Rao">Vikramaditya Rao (Senior Partner)</option>
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