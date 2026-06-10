"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building, Shield, CheckSquare, Clock, Sliders, Cpu, CreditCard,
  Plus, Edit2, Trash2, ArrowLeft, Check, AlertCircle, Eye, ShieldAlert,
  Calendar, Layers, Mail, PhoneCall, HelpCircle, ToggleLeft, Key, UserCheck, Briefcase, Globe, PieChart, Users
} from "lucide-react";
import { SlideOver } from "@/components/ui/slide-over";
import { Avatar } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// --- Types ---
interface BillingOrg {
  id: string;
  name: string;
  gstin?: string | null;
  address?: string | null;
}

interface PermissionRow {
  id: string;
  module: string;
  partner: string;
  manager: string;
  article: string;
  finance: string;
  hr: string;
  description: string;
  isCustom?: boolean;
}

const commonPermissions = [
  { label: "Full CRUD (Global)", value: "Full CRUD (Global)" },
  { label: "Full CRUD (Global/Dept)", value: "Full CRUD (Global/Dept)" },
  { label: "Full CRUD (Assigned/Dept)", value: "Full CRUD (Assigned/Dept)" },
  { label: "Full CRUD", value: "Full CRUD" },
  { label: "Create, Read, Update (Global)", value: "Create, Read, Update (Global)" },
  { label: "Create, Read, Update (Assigned - No Delete)", value: "Create, Read, Update (Assigned - No Delete)" },
  { label: "Read & Update (Assigned Only)", value: "Read & Update (Assigned Only)" },
  { label: "Read & Update (Approve Juniors)", value: "Read & Update (Approve Juniors)" },
  { label: "Create & Update (Own Timesheet)", value: "Create & Update (Own Timesheet)" },
  { label: "Read Only (Global)", value: "Read Only (Global)" },
  { label: "Read Only (Global Dashboards)", value: "Read Only (Global Dashboards)" },
  { label: "Read Only (Team Performance)", value: "Read Only (Team Performance)" },
  { label: "Read Only (Financial Reports)", value: "Read Only (Financial Reports)" },
  { label: "Read Only (Assigned Only)", value: "Read Only (Assigned Only)" },
  { label: "No Access", value: "No Access" }
];

const defaultMatrix: PermissionRow[] = [
  {
    id: "1",
    module: "Client Onboarding & KYC",
    partner: "Full CRUD (Global)",
    manager: "Create, Read, Update (Global)",
    article: "Read Only (Assigned Only)",
    finance: "Read Only (Global)",
    hr: "Read Only (Global)",
    description: "Controls the access level to register new clients, view KYC documentation, and set up client metadata."
  },
  {
    id: "2",
    module: "Billing, Invoices & Fees",
    partner: "Full CRUD (Global)",
    manager: "Read Only (Assigned Only)",
    article: "No Access",
    finance: "Full CRUD (Global)",
    hr: "No Access",
    description: "Access to creating proforma invoices, logging bank transactions, configuring custom client rates, and setting billing structures."
  },
  {
    id: "3",
    module: "Project & Job Creation",
    partner: "Full CRUD (Global)",
    manager: "Full CRUD (Global/Dept)",
    article: "No Access",
    finance: "No Access",
    hr: "No Access",
    description: "Allows the setup of client engagements and launching periodic compliance tasks (GST filings, tax returns)."
  },
  {
    id: "4",
    module: "Task Execution & Checklists",
    partner: "Full CRUD (Global)",
    manager: "Full CRUD (Global/Dept)",
    article: "Read & Update (Assigned Only)",
    finance: "No Access",
    hr: "No Access",
    description: "Handles completing SOP checklists, updating checklist subtasks, and logging general workflow tasks."
  },
  {
    id: "5",
    module: "Timesheet Approvals",
    partner: "Full CRUD (Global)",
    manager: "Read & Update (Approve Juniors)",
    article: "Create & Update (Own Timesheet)",
    finance: "Read Only (Global for Payroll)",
    hr: "Read & Update (Approve Juniors)",
    description: "Processes weekly employee log-sheets, reviews billable hours, and triggers payroll approvals."
  },
  {
    id: "6",
    module: "Client Document Vault",
    partner: "Full CRUD (Global)",
    manager: "Full CRUD (Assigned/Dept)",
    article: "Create, Read, Update (Assigned - No Delete)",
    finance: "No Access",
    hr: "No Access",
    description: "Provides folder management, client shared repositories, and tax return filing uploads."
  },
  {
    id: "7",
    module: "Firm Analytics & Reports",
    partner: "Read Only (Global Dashboards)",
    manager: "Read Only (Team Performance)",
    article: "No Access",
    finance: "Read Only (Financial Reports)",
    hr: "Read Only (Global Dashboards)",
    description: "High-level insights covering operational bottlenecks, individual employee timesheet efficiency, and outstanding receivables."
  },
  {
    id: "8",
    module: "System Settings & RBAC",
    partner: "Full CRUD",
    manager: "No Access",
    article: "No Access",
    finance: "No Access",
    hr: "No Access",
    description: "Configures firm-wide attributes, whitelists IP/timing restricts, manages departments, and edits Master RBAC access controls."
  },
  {
    id: "9",
    module: "Access Logs",
    partner: "Full CRUD (Global)",
    manager: "No Access",
    article: "No Access",
    finance: "No Access",
    hr: "No Access",
    description: "System audit logs tracking access attempts, privilege elevations, compliance alerts, and system-wide file downloads."
  },
  {
    id: "10",
    module: "HR, Staffing & Attendance",
    partner: "Full CRUD (Global)",
    manager: "Read & Update (Approve Juniors)",
    article: "Read Only (Assigned Only)",
    finance: "Read Only (Financial Reports)",
    hr: "Full CRUD (Global)",
    description: "Manages candidate pipeline, dynamic employee directory profiles, Minecraft-styled hierarchical org-tree diagrams, and employee leave application/approval workflows."
  },
  {
    id: "11",
    module: "Timesheet & Task Timer Compliance",
    partner: "Full CRUD (Global)",
    manager: "Read & Update (Approve Juniors)",
    article: "Read Only (Assigned Only)",
    finance: "Read Only (Financial Reports)",
    hr: "Full CRUD (Global)",
    description: "Enforces daily clock-in checks, tracks stopwatch activity, logs daily billable hours, and routes employee timecards for partner/supervisor reviews."
  }
];

interface Department {
  id: string;
  name: string;
  code: string;
  isCoreDelivery: boolean;
  createdAt: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  isNational: boolean;
}

interface TaskSubStatusItem {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface FirmGroup {
  id: string;
  name: string;
  headId: string;
  employeeIds: string[];
  createdAt: string;
}

export default function SettingsPage() {
  const [activeView, setActiveView] = useState<string>("grid"); // "grid" | "billing-orgs" | "roles" | "departments" | "sub-status" | "business-hours" | "holidays" | "leaves" | "modules" | "designations" | "subscription"
  
  // Organizations State
  const [orgs, setOrgs] = useState<BillingOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<BillingOrg | null>(null);

  // Departments State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Holidays State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Permissions Matrix State
  const [matrix, setMatrix] = useState<PermissionRow[]>([]);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [editingMatrixRow, setEditingMatrixRow] = useState<PermissionRow | null>(null);

  // Task Sub-statuses State
  const [subStatuses, setSubStatuses] = useState<TaskSubStatusItem[]>([]);
  const [isSubStatusModalOpen, setIsSubStatusModalOpen] = useState(false);
  const [editingSubStatus, setEditingSubStatus] = useState<TaskSubStatusItem | null>(null);
  const [subStatusName, setSubStatusName] = useState("");
  const [subStatusColor, setSubStatusColor] = useState("bg-blue-100 text-blue-800 border-blue-200");
  const [subStatusDescription, setSubStatusDescription] = useState("");

  // Firm Groups (CA Firm Verticals & Branches) State
  const [firmGroups, setFirmGroups] = useState<FirmGroup[]>([]);
  const [isFirmGroupModalOpen, setIsFirmGroupModalOpen] = useState(false);
  const [editingFirmGroup, setEditingFirmGroup] = useState<FirmGroup | null>(null);
  const [firmGroupName, setFirmGroupName] = useState("");
  const [firmGroupHeadId, setFirmGroupHeadId] = useState("");
  const [firmGroupEmployeeIds, setFirmGroupEmployeeIds] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Modules activation state
  const [globalModules, setGlobalModules] = useState<Record<string, boolean>>({
    leads: true,
    pass: true,
    billing: true,
    hr: true,
    whatsapp: false,
    timesheet_compliance: true
  });


  // Create Custom Role States & Hooks
  const [rolesSubTab, setRolesSubTab] = useState<"matrix" | "create-role">("matrix");
  const [roleName, setRoleName] = useState("");
  const [roleTier, setRoleTier] = useState("Senior");
  const [visibilityScope, setVisibilityScope] = useState("departmental");

  // Access Logs Filter States
  const [logSearch, setLogSearch] = useState("");
  const [logModuleFilter, setLogModuleFilter] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("");
  
  const modulesList = [
    "Leads",
    "Clients & Services",
    "Tasks",
    "Invoice",
    "DSC",
    "Licenses & Passwords",
    "Doc Inbox",
    "Reports"
  ];
  
  const [permissions, setPermissions] = useState<Record<string, {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    maskFinance: boolean;
    restrictDelete: boolean;
  }>>(() => {
    const initial: any = {};
    modulesList.forEach(mod => {
      initial[mod] = {
        create: false,
        read: true,
        update: false,
        delete: false,
        maskFinance: false,
        restrictDelete: false
      };
    });
    return initial;
  });

  const handlePermissionToggle = (module: string, field: 'create' | 'read' | 'update' | 'delete' | 'maskFinance' | 'restrictDelete') => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [field]: !prev[module][field]
      }
    }));
  };

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Custom role '${roleName}' created successfully inside Prabandh!`);
    setRoleName("");
    setRoleTier("Senior");
    setVisibilityScope("departmental");
    setRolesSubTab("matrix");
  };

  // Load Initial Data
  useEffect(() => {
    fetchOrgs();

    // Load LocalStorage backed states
    const localDepts = localStorage.getItem("ca_departments");
    if (localDepts) {
      setDepartments(JSON.parse(localDepts));
    } else {
      const defaultDepts: Department[] = [
        { id: "1", name: "Statutory Audit", code: "AUD", isCoreDelivery: true, createdAt: new Date().toISOString() },
        { id: "2", name: "Indirect Tax (GST)", code: "IDT", isCoreDelivery: true, createdAt: new Date().toISOString() },
        { id: "3", name: "Direct Tax & ITR", code: "ITR", isCoreDelivery: true, createdAt: new Date().toISOString() },
        { id: "4", name: "Corporate Law (MCA)", code: "COR", isCoreDelivery: true, createdAt: new Date().toISOString() },
        { id: "5", name: "HR & Internal Accounts", code: "ADM", isCoreDelivery: false, createdAt: new Date().toISOString() }
      ];
      setDepartments(defaultDepts);
      localStorage.setItem("ca_departments", JSON.stringify(defaultDepts));
    }

    const localHolidays = localStorage.getItem("ca_holidays");
    if (localHolidays) {
      setHolidays(JSON.parse(localHolidays));
    } else {
      const defaultHolidays: Holiday[] = [
        { id: "1", name: "Republic Day", date: "2026-01-26", isNational: true },
        { id: "2", name: "Holi Festival", date: "2026-03-04", isNational: false },
        { id: "3", name: "Independence Day", date: "2026-08-15", isNational: true },
        { id: "4", name: "Gandhi Jayanti", date: "2026-10-02", isNational: true },
        { id: "5", name: "Diwali Festival", date: "2026-11-09", isNational: false }
      ];
      setHolidays(defaultHolidays);
      localStorage.setItem("ca_holidays", JSON.stringify(defaultHolidays));
    }

    const localMatrix = localStorage.getItem("ca_permission_matrix");
    if (localMatrix) {
      let parsed = JSON.parse(localMatrix);
      let migrated = false;
      parsed = parsed.map((row: any) => {
        if (row.hr === undefined) {
          migrated = true;
          let defaultHr = "No Access";
          if (row.module === "Client Onboarding & KYC") defaultHr = "Read Only (Global)";
          else if (row.module === "Timesheet Approvals") defaultHr = "Read & Update (Approve Juniors)";
          else if (row.module === "Firm Analytics & Reports") defaultHr = "Read Only (Global Dashboards)";
          else if (row.module === "HR, Staffing & Attendance") defaultHr = "Full CRUD (Global)";
          return { ...row, hr: defaultHr };
        }
        return row;
      });

      const hasLogs = parsed.some((row: any) => row.module === "Access Logs");
      if (!hasLogs) {
        migrated = true;
        parsed.push({
          id: "9",
          module: "Access Logs",
          partner: "Full CRUD (Global)",
          manager: "No Access",
          article: "No Access",
          finance: "No Access",
          hr: "No Access",
          description: "System audit logs tracking access attempts, privilege elevations, compliance alerts, and system-wide file downloads."
        });
      }

      const hasHR = parsed.some((row: any) => row.module === "HR, Staffing & Attendance");
      if (!hasHR) {
        migrated = true;
        parsed.push({
          id: "10",
          module: "HR, Staffing & Attendance",
          partner: "Full CRUD (Global)",
          manager: "Read & Update (Approve Juniors)",
          article: "Read Only (Assigned Only)",
          finance: "Read Only (Financial Reports)",
          hr: "Full CRUD (Global)",
          description: "Manages candidate pipeline, dynamic employee directory profiles, Minecraft-styled hierarchical org-tree diagrams, and employee leave application/approval workflows."
        });
      }

      const hasCompliance = parsed.some((row: any) => row.module === "Timesheet & Task Timer Compliance");
      if (!hasCompliance) {
        migrated = true;
        parsed.push({
          id: "11",
          module: "Timesheet & Task Timer Compliance",
          partner: "Full CRUD (Global)",
          manager: "Read & Update (Approve Juniors)",
          article: "Read Only (Assigned Only)",
          finance: "Read Only (Financial Reports)",
          hr: "Full CRUD (Global)",
          description: "Enforces daily clock-in checks, tracks stopwatch activity, logs daily billable hours, and routes employee timecards for partner/supervisor reviews."
        });
      }

      if (migrated) {
        localStorage.setItem("ca_permission_matrix", JSON.stringify(parsed));
      }
      setMatrix(parsed);
    } else {
      setMatrix(defaultMatrix);
      localStorage.setItem("ca_permission_matrix", JSON.stringify(defaultMatrix));
    }

    const localSubStatuses = localStorage.getItem("ca_task_substatuses");
    if (localSubStatuses) {
      setSubStatuses(JSON.parse(localSubStatuses));
    } else {
      const defaultSubStatuses: TaskSubStatusItem[] = [
        { 
          id: "1", 
          name: "In Progress", 
          color: "bg-blue-100 text-blue-800 border-blue-200",
          description: "The task is active, and the assigned worker (e.g., Article Clerk or Senior) is actively executing the SOP steps. The internal efficiency timer runs continuously."
        },
        { 
          id: "2", 
          name: "Documents Pending", 
          color: "bg-amber-100 text-amber-800 border-amber-200",
          description: "Execution is entirely blocked because the client has not provided required raw records (e.g., bank statements, purchase bills, or inventory sheets)."
        },
        { 
          id: "3", 
          name: "Queries Raised", 
          color: "bg-red-100 text-red-800 border-red-200",
          description: "The team has found a discrepancy in the data (e.g., an unmapped transaction or a missing GSTIN) and has asked the client for clarification."
        },
        { 
          id: "4", 
          name: "Sign-off Awaited", 
          color: "bg-purple-100 text-purple-800 border-purple-200",
          description: "The work is technically perfect and verified by the manager. It is now waiting in the signing Partner's queue to apply their physical or digital signature (DSC) to the final report."
        },
        { 
          id: "5", 
          name: "In Review", 
          color: "bg-indigo-100 text-indigo-800 border-indigo-200",
          description: "The assignee has finished all checklist items under the SOP and submitted the entire folder for manager verification. Editing is locked."
        },
        { 
          id: "6", 
          name: "Completed", 
          color: "bg-green-100 text-green-800 border-green-200",
          description: "The ultimate green light. The work is filed, reviewed, and administrative/financial protocols are fully settled. The task is moved to historical archives."
        },
        { 
          id: "7", 
          name: "Review Rejected", 
          color: "bg-[#fee2e2] text-[#991b1b] border-[#991b1b]/20",
          description: "The reviewer has rejected the work quality or found errors. Automatically re-assigns the task context visibility back to the original Assignee for corrections."
        },
        { 
          id: "8", 
          name: "Peer Review Pending", 
          color: "bg-[#dbeafe] text-[#1e40af] border-[#1e40af]/20",
          description: "Assigned for cross-verification by another Senior or Peer of equivalent level to verify that compliance and audit standards are satisfied before manager signoff."
        },
        { 
          id: "9", 
          name: "Management Sign-off Awaited", 
          color: "bg-[#fef3c7] text-[#92400e] border-[#92400e]/20",
          description: "The audit report or tax computation is completed, but cannot be filed until the client's own management signs off on the official draft."
        },
        { 
          id: "10", 
          name: "Govt Portal Down", 
          color: "bg-[#ffedd5] text-[#c2410c] border-[#c2410c]/20",
          description: "The compliance team is locked out because the government tax or corporate affairs servers are crashed, slow, or undergoing a maintenance lockout."
        },
        { 
          id: "11", 
          name: "Filed - Billing Pending", 
          color: "bg-[#d1fae5] text-[#065f46] border-[#065f46]/20",
          description: "Technical work is complete and submitted to the government, but the professional fee has not been invoiced or collected yet. Flags invoice generation needed."
        }
      ];
      setSubStatuses(defaultSubStatuses);
      localStorage.setItem("ca_task_substatuses", JSON.stringify(defaultSubStatuses));
    }

    const localFirmGroups = localStorage.getItem("ca_firm_groups");
    if (localFirmGroups) {
      setFirmGroups(JSON.parse(localFirmGroups));
    } else {
      const defaultFirmGroups: FirmGroup[] = [
        { id: "1", name: "Mumbai Corporate Branch", headId: "", employeeIds: [], createdAt: new Date().toISOString() },
        { id: "2", name: "Taxation Division - Team A", headId: "", employeeIds: [], createdAt: new Date().toISOString() },
        { id: "3", name: "Statutory Audit Silo", headId: "", employeeIds: [], createdAt: new Date().toISOString() }
      ];
      setFirmGroups(defaultFirmGroups);
      localStorage.setItem("ca_firm_groups", JSON.stringify(defaultFirmGroups));
    }

    const localModules = localStorage.getItem("prabandh_global_modules");
    if (localModules) {
      const parsed = JSON.parse(localModules);
      if (parsed.timesheet_compliance === undefined) {
        parsed.timesheet_compliance = true;
        localStorage.setItem("prabandh_global_modules", JSON.stringify(parsed));
      }
      setGlobalModules(parsed);
    }

    fetch("/api/users")
      .then(r => r.json())
      .then(d => setUsers(d.data || []));
  }, []);

  // --- API Actions for Billing Organizations ---
  const fetchOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const res = await fetch("/api/organizations");
      const json = await res.json();
      if (json.data) setOrgs(json.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load billing organizations");
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const gstin = formData.get("gstin") as string;
    const address = formData.get("address") as string;

    try {
      if (editingOrg) {
        // Update
        const res = await fetch(`/api/organizations/${editingOrg.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, gstin, address })
        });
        if (res.ok) {
          toast.success("Organization updated successfully");
          setIsOrgModalOpen(false);
          setEditingOrg(null);
          fetchOrgs();
        }
      } else {
        // Create
        const res = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, gstin, address })
        });
        if (res.ok) {
          toast.success("Billing organization added");
          setIsOrgModalOpen(false);
          fetchOrgs();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred saving organization");
    }
  };

  const deleteOrg = async (id: string) => {
    if (!confirm("Are you sure you want to delete this billing organization? This will affect invoices mapped to it.")) return;
    try {
      const res = await fetch(`/api/organizations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Organization removed");
        fetchOrgs();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove organization");
    }
  };

  // --- Local Actions for Departments ---
  const saveDepts = (newDepts: Department[]) => {
    setDepartments(newDepts);
    localStorage.setItem("ca_departments", JSON.stringify(newDepts));
  };

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const isCoreDelivery = formData.get("isCore") === "true";

    if (editingDept) {
      const updated = departments.map(d => d.id === editingDept.id ? { ...d, name, code, isCoreDelivery } : d);
      saveDepts(updated);
      toast.success("Department updated");
      setIsDeptModalOpen(false);
      setEditingDept(null);
    } else {
      const newD: Department = {
        id: Math.random().toString(36).substring(7),
        name,
        code: code.toUpperCase(),
        isCoreDelivery,
        createdAt: new Date().toISOString()
      };
      saveDepts([...departments, newD]);
      toast.success("New Department created");
      setIsDeptModalOpen(false);
    }
  };

  const deleteDept = (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    const filtered = departments.filter(d => d.id !== id);
    saveDepts(filtered);
    toast.success("Department deleted");
  };

  const handleSubStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubStatus) {
      const updated = subStatuses.map(st => 
        st.id === editingSubStatus.id 
          ? { ...st, name: subStatusName, color: subStatusColor, description: subStatusDescription } 
          : st
      );
      setSubStatuses(updated);
      localStorage.setItem("ca_task_substatuses", JSON.stringify(updated));
      toast.success("Sub-status updated successfully");
      setEditingSubStatus(null);
    } else {
      const newSt: TaskSubStatusItem = {
        id: Math.random().toString(36).substring(7),
        name: subStatusName,
        color: subStatusColor,
        description: subStatusDescription
      };
      const updated = [...subStatuses, newSt];
      setSubStatuses(updated);
      localStorage.setItem("ca_task_substatuses", JSON.stringify(updated));
      toast.success("New Sub-status created successfully");
    }
    setIsSubStatusModalOpen(false);
    setSubStatusName("");
    setSubStatusColor("bg-blue-100 text-blue-800 border-blue-200");
    setSubStatusDescription("");
  };

  const deleteSubStatus = (id: string) => {
    if (!confirm("Are you sure you want to delete this sub-status?")) return;
    const filtered = subStatuses.filter(st => st.id !== id);
    setSubStatuses(filtered);
    localStorage.setItem("ca_task_substatuses", JSON.stringify(filtered));
    toast.success("Sub-status deleted successfully");
  };

  // --- CA Firm Verticals & Branches Action Handlers ---
  const handleFirmGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFirmGroup) {
      const updated = firmGroups.map(fg => 
        fg.id === editingFirmGroup.id 
          ? { ...fg, name: firmGroupName, headId: firmGroupHeadId, employeeIds: firmGroupEmployeeIds } 
          : fg
      );
      setFirmGroups(updated);
      localStorage.setItem("ca_firm_groups", JSON.stringify(updated));
      toast.success("Firm Group / Branch details saved");
      setEditingFirmGroup(null);
    } else {
      const newFg: FirmGroup = {
        id: Math.random().toString(36).substring(7),
        name: firmGroupName,
        headId: firmGroupHeadId,
        employeeIds: firmGroupEmployeeIds,
        createdAt: new Date().toISOString()
      };
      const updated = [...firmGroups, newFg];
      setFirmGroups(updated);
      localStorage.setItem("ca_firm_groups", JSON.stringify(updated));
      toast.success("New Firm Group / Branch created");
    }
    setIsFirmGroupModalOpen(false);
    setFirmGroupName("");
    setFirmGroupHeadId("");
    setFirmGroupEmployeeIds([]);
  };

  const deleteFirmGroup = (id: string) => {
    if (!confirm("Are you sure you want to delete this firm group? This cannot be undone.")) return;
    const filtered = firmGroups.filter(fg => fg.id !== id);
    setFirmGroups(filtered);
    localStorage.setItem("ca_firm_groups", JSON.stringify(filtered));
    toast.success("Firm Group / Branch deleted successfully");
  };

  // --- Master Permission Matrix Dynamic Action Handlers ---
  const handleCellChange = (rowId: string, role: 'partner' | 'manager' | 'article' | 'finance' | 'hr', value: string) => {
    let finalValue = value;
    if (value === "CUSTOM") {
      const customText = prompt("Enter custom permission level details:");
      if (!customText) return; // cancel
      finalValue = customText;
    }
    
    const updated = matrix.map(row => {
      if (row.id === rowId) {
        return { ...row, [role]: finalValue };
      }
      return row;
    });
    
    setMatrix(updated);
    localStorage.setItem("ca_permission_matrix", JSON.stringify(updated));
    toast.success("Permission updated successfully");
  };

  const deleteMatrixRow = (id: string, isCustom?: boolean) => {
    if (!isCustom) {
      if (!confirm("This is a system default permission module. Are you sure you want to delete it? This might affect standard system behavior.")) return;
    } else {
      if (!confirm("Are you sure you want to delete this custom permission module?")) return;
    }
    const filtered = matrix.filter(r => r.id !== id);
    setMatrix(filtered);
    localStorage.setItem("ca_permission_matrix", JSON.stringify(filtered));
    toast.success("Module deleted from permission matrix");
  };

  const getPermissionBadgeClass = (text: string) => {
    if (!text) return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200";
    if (text.startsWith("Full CRUD")) return "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200";
    if (text.includes("Create") || text.includes("Update")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200";
    if (text.includes("Read Only")) return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200";
    return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* HEADER NAVBAR */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          {activeView !== "grid" && (
            <button 
              onClick={() => setActiveView("grid")} 
              className="p-2 border rounded-full hover:bg-muted transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1b4d3e]">
              {activeView === "grid" && "System Settings"}
              {activeView === "billing-orgs" && "Billing Organizations"}
              {activeView === "roles" && "Master Role Permissions Matrix"}
              {activeView === "departments" && "CA Departments Management"}
              {activeView === "task-rules" && "Task Workflow & Access Rules"}
              {activeView === "sub-status" && "Custom Task Sub-statuses"}
              {activeView === "business-hours" && "Business Hours & Timings"}
              {activeView === "holidays" && "Firm Holiday Calendar"}
              {activeView === "leaves" && "Leaves Configuration"}
              {activeView === "modules" && "Core App Modules"}
              {activeView === "subscription" && "Subscription & Add-ons"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeView === "grid" && "Configure CA practice firm rules, billing entities, departments, and Master access permissions."}
              {activeView === "billing-orgs" && "Establish and manage billing entities across different branches or partnership offices."}
              {activeView === "roles" && "Master permission access sheet mapped across standard corporate role tiers."}
              {activeView === "departments" && "Register specific work silos (GST, Audit, Direct Tax) and configure core operations."}
              {activeView === "task-rules" && "Secure operational hierarchy guidelines mapping direct supervisor controls."}
              {activeView === "sub-status" && "Manage custom workflow sub-statuses for finer task control."}
              {activeView === "business-hours" && "Establish firm timing hours and weekly off days."}
              {activeView === "holidays" && "Set standard holiday schedules for all employees."}
              {activeView === "leaves" && "Configure annual sick, casual, and earned leave allocations."}
              {activeView === "modules" && "Enable or disable custom add-ons within the CA Practice Manager."}
              {activeView === "subscription" && "Manage your firm's subscription tier, billing, and unlock premium AI modules."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeView === "billing-orgs" && (
            <button 
              onClick={() => { setEditingOrg(null); setIsOrgModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-[#1b4d3e] text-white rounded-md hover:bg-emerald-950 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Organization
            </button>
          )}
          {activeView === "departments" && (
            <button 
              onClick={() => { setEditingDept(null); setIsDeptModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-[#1b4d3e] text-white rounded-md hover:bg-emerald-950 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Department
            </button>
          )}
          {activeView === "roles" && (
            <button 
              onClick={() => { setEditingMatrixRow(null); setIsMatrixModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-[#1b4d3e] text-white rounded-md hover:bg-emerald-950 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Module
            </button>
          )}
          {activeView === "sub-status" && (
            <button 
              onClick={() => { setEditingSubStatus(null); setSubStatusName(""); setSubStatusColor("bg-blue-100 text-blue-800 border-blue-200"); setIsSubStatusModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-[#1b4d3e] text-white rounded-md hover:bg-emerald-950 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sub-status
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MASTER GRID VIEW (The 8 Cards Grid) */}
      {/* ======================================================== */}
      {activeView === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
          
          {/* Card 1: Billing Organizations */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-emerald-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Billing Organizations</span>
                <Building className="w-5 h-5 text-emerald-600" />
              </div>
              <ul className="space-y-2 mt-4 text-xs font-medium">
                {orgs.length > 0 ? (
                  orgs.map(org => (
                    <li key={org.id} className="text-primary truncate">🏛️ {org.name}</li>
                  ))
                ) : (
                  <li className="text-muted-foreground italic">No organizations set up</li>
                )}
              </ul>
            </div>
            <button 
              onClick={() => setActiveView("billing-orgs")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-[#1b4d3e] hover:bg-muted group-hover:border-[#1b4d3e] transition-colors mt-4"
            >
              Manage Organizations ({orgs.length})
            </button>
          </div>

          {/* Card 2: Roles & Permissions */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-indigo-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Roles & permissions</span>
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 mt-3">
                <button onClick={() => setActiveView("roles")} className="text-left text-xs text-indigo-600 hover:text-indigo-800 font-medium">🛡️ Roles & Matrix</button>
                <button onClick={() => setActiveView("departments")} className="text-left text-xs text-indigo-600 hover:text-indigo-800 font-medium">🏢 Departments</button>
                <button onClick={() => { setActiveView("task-rules"); }} className="text-left text-xs text-indigo-600 hover:text-indigo-800 font-medium">⚖️ Task Rules</button>
                <button onClick={() => { window.location.href = "/reports/access-logs"; }} className="text-left text-xs text-indigo-600 hover:text-indigo-800 font-medium">🌐 Access Logs</button>
              </div>
            </div>
            <button 
              onClick={() => setActiveView("roles")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-indigo-600 hover:bg-muted group-hover:border-indigo-600 transition-colors mt-4"
            >
              View Access Control
            </button>
          </div>

          {/* Card 3: Task Module */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-orange-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Task Module</span>
                <CheckSquare className="w-5 h-5 text-orange-600" />
              </div>
              <ul className="space-y-2.5 mt-4 text-xs font-medium text-muted-foreground">
                <li className="flex items-center gap-2 cursor-pointer hover:text-foreground" onClick={() => setActiveView("sub-status")}>📌 Task Sub-status Settings</li>
                <li className="flex items-center gap-2">✓ Auto-recurrences</li>
                <li className="flex items-center gap-2">⚠️ Escalation Thresholds</li>
              </ul>
            </div>
            <button 
              onClick={() => setActiveView("sub-status")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-orange-600 hover:bg-muted group-hover:border-orange-600 transition-colors mt-4"
            >
              Setup Task Parameters
            </button>
          </div>

          {/* Card 4: Attendance & Leaves */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-sky-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Attendance & Leaves</span>
                <Clock className="w-5 h-5 text-sky-600" />
              </div>
              <div className="grid grid-cols-1 gap-2.5 mt-4 text-xs font-medium text-muted-foreground">
                <button onClick={() => setActiveView("business-hours")} className="text-left hover:text-foreground">🕒 Business Timing Hours</button>
                <button onClick={() => setActiveView("holidays")} className="text-left hover:text-foreground">📅 National Holiday Calendar</button>
                <button onClick={() => setActiveView("leaves")} className="text-left hover:text-foreground">🍁 Leaves Policy Configuration</button>
              </div>
            </div>
            <button 
              onClick={() => setActiveView("business-hours")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-sky-600 hover:bg-muted group-hover:border-sky-600 transition-colors mt-4"
            >
              Setup Office Timings
            </button>
          </div>

          {/* Card 5: CA Firm Verticals & Branches */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-rose-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">CA Firm Verticals & Branches</span>
                <Sliders className="w-5 h-5 text-rose-600" />
              </div>
              <ul className="space-y-2.5 mt-4 text-xs font-medium text-muted-foreground">
                <li className="flex items-center gap-2">🏢 Mumbai Corporate Branch</li>
                <li className="flex items-center gap-2">👥 Taxation Division - Team A</li>
                <li className="flex items-center gap-2">🛡️ Statutory Audit Silo</li>
              </ul>
            </div>
            <button 
              onClick={() => setActiveView("firm-groups")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-rose-600 hover:bg-muted group-hover:border-rose-600 transition-colors mt-4"
            >
              Manage Verticals & Branches
            </button>
          </div>

          {/* Card 6: Integrations */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-teal-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Integrations</span>
                <Cpu className="w-5 h-5 text-teal-600" />
              </div>
              <ul className="space-y-2 mt-4 text-xs font-medium text-muted-foreground">
                <li className="flex items-center gap-2">📧 Email SMTP Gateway</li>
                <li className="flex items-center gap-2">💬 WhatsApp API Reminders</li>
                <li className="flex items-center gap-2">📝 Custom Templates</li>
              </ul>
            </div>
            <button 
              onClick={() => toast.success("Integrations are active and running in backend")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-teal-600 hover:bg-muted group-hover:border-teal-600 transition-colors mt-4"
            >
              Configure Gateway API
            </button>
          </div>

          {/* Card 7: Modules */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-purple-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Modules</span>
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <ul className="space-y-2 mt-4 text-xs font-medium text-muted-foreground">
                <li className="flex items-center gap-2">👥 Employee HR Hub</li>
                <li className="flex items-center gap-2">🔒 Vault Passwords</li>
                <li className="flex items-center gap-2">📂 Bulk Import Center</li>
              </ul>
            </div>
            <button 
              onClick={() => setActiveView("modules")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-purple-600 hover:bg-muted group-hover:border-purple-600 transition-colors mt-4"
            >
              Toggle Core Modules
            </button>
          </div>

          {/* Card 8: Subscription */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-blue-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Subscription & Invoices</span>
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-xs font-bold text-primary">Enterprise Pro Plan</div>
                <div className="text-[10px] text-muted-foreground">Next renewal: Jan 15, 2027</div>
              </div>
            </div>
            <button
              onClick={() => setActiveView("subscription")}
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-blue-600 hover:bg-muted group-hover:border-blue-600 transition-colors mt-4"
            >
              Manage Subscription
            </button>
          </div>

          {/* Card: Task & Service Module */}
          <div className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-all border-l-4 border-l-violet-600 flex flex-col justify-between group h-64">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-[#1b4d3e]">Task & Service Module</span>
                <Briefcase className="w-5 h-5 text-violet-600" />
              </div>
              <div className="grid grid-cols-1 gap-y-2 mt-3 text-xs font-medium text-violet-700">
                <span>📋 Services Master</span>
                <span>🔖 SOP Checklists</span>
                <span>⚙️ Task Sub-statuses</span>
              </div>
            </div>
            <Link
              href="/settings/services"
              className="w-full text-center py-2 border rounded-lg text-xs font-semibold text-violet-600 hover:bg-muted group-hover:border-violet-600 transition-colors mt-4 block"
            >
              Manage Services & SOPs
            </Link>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUB-VIEW: BILLING ORGANIZATIONS */}
      {/* ======================================================== */}
      {activeView === "billing-orgs" && (
        <div className="bg-card border rounded-xl p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Building className="w-5 h-5 text-[#1b4d3e]" />
              Manage Billing Entities
            </h2>
            <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-bold">
              Total: {orgs.length}
            </span>
          </div>

          {loadingOrgs ? (
            <div className="py-12 text-center text-sm text-muted-foreground italic">
              Loading organizations from database...
            </div>
          ) : orgs.length === 0 ? (
            <div className="py-12 border border-dashed rounded-xl text-center space-y-3">
              <Building className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <div className="text-sm font-semibold text-muted-foreground">No billing organizations registered yet.</div>
              <button 
                onClick={() => { setEditingOrg(null); setIsOrgModalOpen(true); }}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold"
              >
                Add Your First Organization
              </button>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-card/50">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-bold border-b">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orgs.map((org) => (
                    <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 font-bold text-[#1b4d3e]">{org.name}</td>
                      <td className="px-4 py-4">
                        {org.gstin ? (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded font-mono text-xs font-bold">
                            {org.gstin}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Not Provided</span>
                        )}
                      </td>
                      <td className="px-4 py-4 max-w-xs truncate text-muted-foreground text-xs">{org.address || "—"}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditingOrg(org); setIsOrgModalOpen(true); }}
                            className="p-1.5 hover:bg-muted rounded-md text-primary"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteOrg(org.id)}
                            className="p-1.5 hover:bg-muted rounded-md text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SUB-VIEW: MASTER ROLE PERMISSION MATRIX */}
        {activeView === "roles" && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {/* Permission Sub-header tabs */}
          <div className="flex gap-2 border-b pb-1">
            <button 
              onClick={() => setRolesSubTab("matrix")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all focus:outline-none",
                rolesSubTab === "matrix" 
                  ? "border-b-2 border-b-[#1b4d3e] font-bold text-[#1b4d3e]" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              Master Access Matrix
            </button>
            <button 
              onClick={() => setRolesSubTab("create-role")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all focus:outline-none",
                rolesSubTab === "create-role" 
                  ? "border-b-2 border-b-[#1b4d3e] font-bold text-[#1b4d3e]" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              Create Custom Role
            </button>
            <button onClick={() => setActiveView("departments")} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary focus:outline-none">
              CA Departments
            </button>
            <button onClick={() => setActiveView("task-rules")} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary focus:outline-none">
              Task Workflow Rules
            </button>
          </div>

          {/* SUB-TAB A: MASTER ACCESS PERMISSION MATRIX */}
          {rolesSubTab === "matrix" && (
            <div className="bg-card border rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Access Silo Rule:</span> Article Clerks are restricted strictly to **Assigned Only** records. Managers and Directors bypass explicit assignments if they belong to the **Department** handling the client, while Partners/IT Admins bypass security globally.
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs bg-muted/60 uppercase text-muted-foreground font-bold border-b">
                      <tr>
                        <th className="px-4 py-4 w-[240px]">Module / Feature</th>
                        <th className="px-4 py-4 text-center">Partner / Director</th>
                        <th className="px-4 py-4 text-center">Manager / Asst. Manager</th>
                        <th className="px-4 py-4 text-center">Article Clerk / Intern</th>
                        <th className="px-4 py-4 text-center">Finance & Billing Admin</th>
                        <th className="px-4 py-4 text-center">HR & Admin Dept / Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {matrix.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-4 py-4 font-semibold text-primary">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#1b4d3e]">{row.module}</span>
                              {row.isCustom && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded font-bold font-mono text-[9px] border border-indigo-200">
                                  Custom
                                </span>
                              )}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                <button
                                  onClick={() => { setEditingMatrixRow(row); setIsMatrixModalOpen(true); }}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-[#1b4d3e] transition-colors"
                                  title="Edit Module Name & Description"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteMatrixRow(row.id, row.isCustom)}
                                  className="p-1 hover:bg-muted rounded text-red-500 hover:text-red-700 transition-colors"
                                  title="Delete Module"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5 max-w-[220px]">
                              {row.description}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <select
                              value={row.partner}
                              onChange={(e) => handleCellChange(row.id, 'partner', e.target.value)}
                              className={cn(
                                "w-full rounded border px-2 py-1 text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#1b4d3e] cursor-pointer transition-all",
                                getPermissionBadgeClass(row.partner)
                              )}
                            >
                              {commonPermissions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-background text-foreground font-semibold">
                                  {opt.label}
                                </option>
                              ))}
                              {!commonPermissions.some(p => p.value === row.partner) && (
                                <option value={row.partner} className="bg-background text-foreground font-semibold">
                                  {row.partner} (Custom)
                                </option>
                              )}
                              <option value="CUSTOM" className="bg-background text-indigo-600 font-bold">
                                ✏️ Enter Custom Level...
                              </option>
                            </select>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <select
                              value={row.manager}
                              onChange={(e) => handleCellChange(row.id, 'manager', e.target.value)}
                              className={cn(
                                "w-full rounded border px-2 py-1 text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#1b4d3e] cursor-pointer transition-all",
                                getPermissionBadgeClass(row.manager)
                              )}
                            >
                              {commonPermissions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-background text-foreground font-semibold">
                                  {opt.label}
                                </option>
                              ))}
                              {!commonPermissions.some(p => p.value === row.manager) && (
                                <option value={row.manager} className="bg-background text-foreground font-semibold">
                                  {row.manager} (Custom)
                                </option>
                              )}
                              <option value="CUSTOM" className="bg-background text-indigo-600 font-bold">
                                ✏️ Enter Custom Level...
                              </option>
                            </select>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <select
                              value={row.article}
                              onChange={(e) => handleCellChange(row.id, 'article', e.target.value)}
                              className={cn(
                                "w-full rounded border px-2 py-1 text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#1b4d3e] cursor-pointer transition-all",
                                getPermissionBadgeClass(row.article)
                              )}
                            >
                              {commonPermissions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-background text-foreground font-semibold">
                                  {opt.label}
                                </option>
                              ))}
                              {!commonPermissions.some(p => p.value === row.article) && (
                                <option value={row.article} className="bg-background text-foreground font-semibold">
                                  {row.article} (Custom)
                                </option>
                              )}
                              <option value="CUSTOM" className="bg-background text-indigo-600 font-bold">
                                ✏️ Enter Custom Level...
                              </option>
                            </select>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <select
                              value={row.finance}
                              onChange={(e) => handleCellChange(row.id, 'finance', e.target.value)}
                              className={cn(
                                "w-full rounded border px-2 py-1 text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#1b4d3e] cursor-pointer transition-all",
                                getPermissionBadgeClass(row.finance)
                              )}
                            >
                              {commonPermissions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-background text-foreground font-semibold">
                                  {opt.label}
                                </option>
                              ))}
                              {!commonPermissions.some(p => p.value === row.finance) && (
                                <option value={row.finance} className="bg-background text-foreground font-semibold">
                                  {row.finance} (Custom)
                                </option>
                              )}
                              <option value="CUSTOM" className="bg-background text-indigo-600 font-bold">
                                ✏️ Enter Custom Level...
                              </option>
                            </select>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <select
                              value={row.hr}
                              onChange={(e) => handleCellChange(row.id, 'hr', e.target.value)}
                              className={cn(
                                "w-full rounded border px-2 py-1 text-[10px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#1b4d3e] cursor-pointer transition-all",
                                getPermissionBadgeClass(row.hr)
                              )}
                            >
                              {commonPermissions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-background text-foreground font-semibold">
                                  {opt.label}
                                </option>
                              ))}
                              {!commonPermissions.some(p => p.value === row.hr) && (
                                <option value={row.hr} className="bg-background text-foreground font-semibold">
                                  {row.hr} (Custom)
                                </option>
                              )}
                              <option value="CUSTOM" className="bg-background text-indigo-600 font-bold">
                                ✏️ Enter Custom Level...
                              </option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB B: CREATE CUSTOM ROLE DASHBOARD */}
          {rolesSubTab === "create-role" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header Zone */}
              <div className="bg-card border rounded-xl p-5 shadow-sm space-y-1">
                <h2 className="text-lg font-bold tracking-tight text-[#1b4d3e]">
                  Create Custom Role
                </h2>
                <p className="text-xs text-muted-foreground font-medium">
                  Define custom access permissions and operational boundaries for firm members inside Prabandh.
                </p>
              </div>

              <form onSubmit={handleCreateRoleSubmit} className="space-y-6">
                
                {/* Form Section 1: Basic Info */}
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="text-xs font-bold text-[#1b4d3e] uppercase tracking-wider border-b pb-1">Section 1: Basic Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Role Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior Tax Associate"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20 focus:border-[#1b4d3e]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Role Tier *</label>
                      <select
                        value={roleTier}
                        onChange={(e) => setRoleTier(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20 focus:border-[#1b4d3e]"
                      >
                        {["Partner", "Director", "Manager", "Senior", "Article", "Support Admin"].map(tier => (
                          <option key={tier} value={tier}>{tier}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Form Section 2: Data Visibility Scope */}
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="text-xs font-bold text-[#1b4d3e] uppercase tracking-wider border-b pb-1">Section 2: Data Visibility Scope</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { value: "global", label: "Global Access", desc: "User can see and modify data across the entire firm (all branches/departments)." },
                      { value: "departmental", label: "Departmental Access Only", desc: "User can only see or modify data within their primary department silo." },
                      { value: "assigned", label: "Assigned Engagements Only", desc: "User is strictly restricted to records they are explicitly assigned to." }
                    ].map(scope => (
                      <label 
                        key={scope.value} 
                        className={cn(
                          "border rounded-xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:bg-muted/10 shadow-sm",
                          visibilityScope === scope.value ? "border-[#1b4d3e] bg-[#1b4d3e]/5 ring-1 ring-[#1b4d3e]" : "border-border/60 bg-card"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="visibilityScope"
                            value={scope.value}
                            checked={visibilityScope === scope.value}
                            onChange={() => setVisibilityScope(scope.value)}
                            className="w-4 h-4 text-[#1b4d3e] focus:ring-[#1b4d3e] border-border"
                          />
                          <span className="font-bold text-sm text-primary">{scope.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">{scope.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Form Section 3: Granular Permissions Matrix */}
                <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="text-xs font-bold text-[#1b4d3e] uppercase tracking-wider border-b pb-1">Section 3: Granular Permissions Matrix</div>
                  
                  <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs bg-muted/60 uppercase text-muted-foreground font-bold border-b">
                          <tr>
                            <th className="px-4 py-4 w-[200px]">Module / Feature</th>
                            <th className="px-4 py-4 text-center w-[80px]">Create</th>
                            <th className="px-4 py-4 text-center w-[80px]">Read</th>
                            <th className="px-4 py-4 text-center w-[80px]">Update</th>
                            <th className="px-4 py-4 text-center w-[80px]">Delete</th>
                            <th className="px-4 py-4 text-center w-[220px]">Special Conditions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {modulesList.map((mod) => (
                            <tr key={mod} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3.5 font-bold text-[#1b4d3e]">
                                {mod}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[mod].create}
                                  onChange={() => handlePermissionToggle(mod, 'create')}
                                  className="w-4 h-4 rounded text-[#1b4d3e] focus:ring-[#1b4d3e]/50 border-border/80 cursor-pointer bg-background"
                                />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[mod].read}
                                  onChange={() => handlePermissionToggle(mod, 'read')}
                                  className="w-4 h-4 rounded text-[#1b4d3e] focus:ring-[#1b4d3e]/50 border-border/80 cursor-pointer bg-background"
                                />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[mod].update}
                                  onChange={() => handlePermissionToggle(mod, 'update')}
                                  className="w-4 h-4 rounded text-[#1b4d3e] focus:ring-[#1b4d3e]/50 border-border/80 cursor-pointer bg-background"
                                />
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={permissions[mod].delete}
                                  onChange={() => handlePermissionToggle(mod, 'delete')}
                                  className="w-4 h-4 rounded text-[#1b4d3e] focus:ring-[#1b4d3e]/50 border-border/80 cursor-pointer bg-background"
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col gap-2 justify-center items-start text-xs font-semibold pl-4">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={permissions[mod].maskFinance}
                                      onChange={() => handlePermissionToggle(mod, 'maskFinance')}
                                      className="w-3.5 h-3.5 rounded text-[#1b4d3e] focus:ring-[#1b4d3e]/50 border-border/80 cursor-pointer bg-background"
                                    />
                                    <span>Mask Financials</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={permissions[mod].restrictDelete}
                                      onChange={() => handlePermissionToggle(mod, 'restrictDelete')}
                                      className="w-3.5 h-3.5 rounded text-[#1b4d3e] focus:ring-[#1b4d3e]/50 border-border/80 cursor-pointer bg-background"
                                    />
                                    <span>Restrict Deletion</span>
                                  </label>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Actions Zone */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRolesSubTab("matrix")}
                    className="px-4 py-2 border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1b4d3e] text-white text-xs font-semibold rounded-lg hover:bg-[#1b4d3e]/90 transition-all shadow-sm"
                  >
                    Save Custom Role
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SUB-VIEW: CA DEPARTMENTS CRUD */}
      {/* ======================================================== */}
      {activeView === "departments" && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {/* Sub tabs */}
          <div className="flex gap-2 border-b pb-1">
            <button onClick={() => setActiveView("roles")} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
              Master Access Matrix
            </button>
            <button className="px-4 py-2 border-b-2 border-b-[#1b4d3e] text-sm font-bold text-[#1b4d3e]">
              CA Departments
            </button>
            <button onClick={() => setActiveView("task-rules")} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
              Task Workflow Rules
            </button>
          </div>

          <div className="bg-card border rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                Departments Listing
              </h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-bold">
                Total Silos: {departments.length}
              </span>
            </div>

            <div className="border rounded-xl overflow-hidden bg-card/40">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-bold border-b">
                  <tr>
                    <th className="px-4 py-3.5">Dept Code</th>
                    <th className="px-4 py-3.5">Department Name</th>
                    <th className="px-4 py-3.5">Delivery Type</th>
                    <th className="px-4 py-3.5">Created At</th>
                    <th className="px-4 py-3.5 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded font-bold font-mono text-xs">
                          {dept.code}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-[#1b4d3e]">{dept.name}</td>
                      <td className="px-4 py-4">
                        {dept.isCoreDelivery ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-200/50">
                            ● Core CA Silo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/55 px-2 py-0.5 rounded-full border border-border/50">
                            ○ Operations / Admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {new Date(dept.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditingDept(dept); setIsDeptModalOpen(true); }}
                            className="p-1.5 hover:bg-muted rounded-md text-primary"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteDept(dept.id)}
                            className="p-1.5 hover:bg-muted rounded-md text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4b. SUB-VIEW: TASK WORKFLOW RULES (The Hierarchy Layer) */}
      {/* ======================================================== */}
      {activeView === "task-rules" && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {/* Sub tabs */}
          <div className="flex gap-2 border-b pb-1">
            <button onClick={() => setActiveView("roles")} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
              Master Access Matrix
            </button>
            <button onClick={() => setActiveView("departments")} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
              CA Departments
            </button>
            <button className="px-4 py-2 border-b-2 border-b-[#1b4d3e] text-sm font-bold text-[#1b4d3e]">
              Task Workflow Rules
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Box: Enforced Hierarchy Rules */}
            <div className="bg-card border rounded-xl p-6 space-y-6">
              <h3 className="font-bold text-base text-[#1b4d3e] flex items-center gap-2 border-b pb-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Permanent User Hierarchy
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700 flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <div className="font-semibold text-primary">Single Primary Department Silo</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Enforced via `users.primary_department_id`. Each staff member belongs to a single department (e.g. Audit, GST) to secure department-specific records.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700 flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <div className="font-semibold text-primary">Direct Supervisor Assignment</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Enforced via `users.permanent_supervisor_id`. Articles/clerks report to a designated senior/manager who acts as their permanent reviewer.
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual organizational chart */}
              <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hierarchy Workflow Flowchart</div>
                <div className="flex flex-col items-center gap-2 pt-2 text-center text-xs">
                  <div className="bg-[#1b4d3e] text-white px-3 py-1.5 rounded shadow-sm font-semibold w-48">
                    Partner / IT Admin
                    <div className="text-[9px] font-normal text-emerald-200">Global Bypass Access</div>
                  </div>
                  <div className="h-4 w-px bg-muted-foreground/30" />
                  <div className="bg-indigo-900 text-indigo-100 px-3 py-1.5 rounded shadow-sm font-semibold w-48">
                    Supervisor (Manager/Senior)
                    <div className="text-[9px] font-normal text-indigo-200">Primary Department Silo</div>
                  </div>
                  <div className="h-4 w-px bg-muted-foreground/30" />
                  <div className="bg-muted border border-border px-3 py-1.5 rounded shadow-sm font-semibold w-48 text-primary">
                    Article Clerk / Intern
                    <div className="text-[9px] font-normal text-muted-foreground">Strict Assigned-Only Silo</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: Task-Specific Assignment Rules */}
            <div className="bg-card border rounded-xl p-6 space-y-6">
              <h3 className="font-bold text-base text-[#1b4d3e] flex items-center gap-2 border-b pb-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                Task Operational Assignment
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-700 flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <div className="font-semibold text-primary">Assigned Worker (`assigned_worker_id`)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      The clerk executing the compliance checklists (e.g. Article). They hold access to read and update task-status for assigned tasks only.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-700 flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <div className="font-semibold text-primary">Active Task Supervisor (`active_supervisor_id`)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      The specific senior/manager reviewing and signing off on THIS specific task. Bypasses general article restriction rules for reviews.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-700 flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <div className="font-semibold text-primary">Department Silo (`department_id`)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      The service department owning the job. Restricts task operations to members belonging to that department bridge (`user_departments`).
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic access simulator log */}
              <div className="bg-[#1b4d3e]/5 dark:bg-emerald-950/20 border border-emerald-800/20 rounded-xl p-4 text-xs space-y-3 font-mono">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                  <Check className="w-3.5 h-3.5" /> Security Rule Simulation
                </div>
                <div className="text-muted-foreground">
                  -- Evaluates logged in Article Clerk access:<br/>
                  SELECT has_access FROM user_departments WHERE user_id = current_user AND department_id = task.department_id AND EXISTS (SELECT 1 FROM client_assignments WHERE user_id = current_user AND client_id = task.client_id);
                </div>
                <div className="border-t border-emerald-800/10 pt-2 flex items-center justify-between text-[11px] font-sans font-bold">
                  <span className="text-primary">System Access Check:</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-300">
                    PASS (Assigned Silo Secure)
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SUB-VIEW: TASK SUB-STATUSES */}
      {/* ======================================================== */}
      {activeView === "sub-status" && (
        <div className="bg-card border rounded-xl p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1b4d3e] flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Task Sub-status Config
            </h2>
            <button 
              onClick={() => { 
                setEditingSubStatus(null); 
                setSubStatusName(""); 
                setSubStatusColor("bg-blue-100 text-blue-800 border-blue-200"); 
                setSubStatusDescription("");
                setIsSubStatusModalOpen(true); 
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#1b4d3e] text-white rounded-md hover:bg-emerald-950 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sub-status
            </button>
          </div>

          {/* Active Sub-statuses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {subStatuses.map((st) => (
              <div key={st.id} className="p-4 border rounded-xl flex flex-col justify-between bg-card/30 group hover:shadow-sm transition-all relative min-h-[96px]">
                <div className="flex items-start justify-between">
                  <span className={cn("px-2.5 py-1 rounded text-xs font-bold border", st.color)}>{st.name}</span>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingSubStatus(st);
                        setSubStatusName(st.name);
                        setSubStatusColor(st.color);
                        setSubStatusDescription(st.description || "");
                        setIsSubStatusModalOpen(true);
                      }}
                      className="p-1 hover:bg-muted rounded text-primary"
                      title="Edit Sub-status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSubStatus(st.id)}
                      className="p-1 hover:bg-muted rounded text-red-500 hover:text-red-700"
                      title="Delete Sub-status"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {st.description && (
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                    {st.description}
                  </p>
                )}
              </div>
            ))}
            {subStatuses.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground text-xs italic">
                No custom sub-statuses configured.
              </div>
            )}
          </div>

          {/* Operational Workflow Definitions Section */}
          <div className="bg-card border rounded-xl p-6 space-y-6 mt-6 shadow-sm">
            <h3 className="font-bold text-base text-[#1b4d3e] flex items-center gap-2 border-b pb-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              Operational Workflow Definitions
            </h3>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seeing all 11 sub-statuses laid out on your <span className="font-bold text-[#1b4d3e]">Prabandh</span> configuration panel looks incredibly clean and comprehensive! This collection covers almost every real-world scenario a mid-to-large CA firm faces daily. Defining them explicitly from an <span className="font-bold text-[#1b4d3e]">operational and software workflow standpoint</span> establishes the exact ground rules for how the system handles task state changes.
            </p>

            <div className="grid grid-cols-1 gap-6 pt-2">
              {[
                { 
                  name: "In Progress", 
                  color: "bg-blue-100 text-blue-800 border-blue-200", 
                  meaning: "The task is active, and the assigned worker (e.g., Article Clerk or Senior) is actively executing the SOP steps.",
                  behavior: "The internal efficiency timer runs continuously. The task appears squarely in the assignee's personal \"To-Do Today\" view."
                },
                { 
                  name: "Documents Pending", 
                  color: "bg-amber-100 text-amber-800 border-amber-200", 
                  meaning: "Execution is entirely blocked because the client has not provided required raw records (e.g., bank statements, purchase bills, or inventory sheets).",
                  behavior: "Triggers an automated notification to the client portal. Internally, it acts as an insurance policy for the staff—proving the delay lies with the client, not the firm."
                },
                { 
                  name: "Queries Raised", 
                  color: "bg-red-100 text-red-800 border-red-200", 
                  meaning: "The team has found a discrepancy in the data (e.g., an unmapped transaction or a missing GSTIN) and has asked the client for clarification.",
                  behavior: "The task transitions to a waiting room state. It alerts the supervisor that a technical query is open, preventing the assignment from turning cold."
                },
                { 
                  name: "In Review", 
                  color: "bg-indigo-100 text-indigo-800 border-indigo-200", 
                  meaning: "The assignee has finished all checklist items under the SOP and submitted the entire folder for manager verification.",
                  behavior: "The assignee's editing permissions are locked. The task dynamically shifts to the assigned Reviewer’s priority dashboard."
                },
                { 
                  name: "Review Rejected", 
                  color: "bg-[#fee2e2] text-[#991b1b] border-[#991b1b]/20", 
                  meaning: "The Reviewer (Manager/Senior) found an error, calculation mistake, or missing piece of evidence in the working papers and sent it back.",
                  behavior: "The card drops straight back to the assignee's active list with a \"High Priority\" flag, requiring them to address the reviewer's linked notes immediately."
                },
                { 
                  name: "Peer Review Pending", 
                  color: "bg-[#dbeafe] text-[#1e40af] border-[#1e40af]/20", 
                  meaning: "Used in large or highly regulated engagements (like statutory corporate audits). The primary manager has approved it, but it requires a second independent check by another partner or a quality assurance team.",
                  behavior: "Routes the file out of the immediate team's silo and into the firm's global peer-review or compliance queue."
                },
                { 
                  name: "Sign-off Awaited", 
                  color: "bg-purple-100 text-purple-800 border-purple-200", 
                  meaning: "The work is technically perfect and verified by the manager. It is now waiting in the signing Partner’s queue to apply their physical or digital signature (DSC) to the final report.",
                  behavior: "Flags the item for the Partner as a high-stakes, final delivery element."
                },
                { 
                  name: "Management Sign-off Awaited", 
                  color: "bg-[#fef3c7] text-[#92400e] border-[#92400e]/20", 
                  meaning: "The firm has completed the audit report or tax computation, but it cannot be legally filed until the client's own management signs off on the official \"Management Representation Letter\" or balance sheet draft.",
                  behavior: "Keeps the task open but clearly attributes the final bottleneck to the client's corporate board room."
                },
                { 
                  name: "Govt Portal Down", 
                  color: "bg-[#ffedd5] text-[#c2410c] border-[#c2410c]/20", 
                  meaning: "The team is attempting final compliance submission, but government tax or corporate affairs servers are crashed, slow, or undergoing a maintenance lockout.",
                  behavior: "This is a critical tracking tag during peak filing seasons (like July 31st or September 30th). It protects the firm's SLA tracking metrics by proving the compliance was delayed by external government infrastructure."
                },
                { 
                  name: "Filed - Billing Pending", 
                  color: "bg-[#d1fae5] text-[#065f46] border-[#065f46]/20", 
                  meaning: "The technical work is completely done and successfully submitted to the government. However, the firm hasn't generated or collected the professional fee for this specific cycle yet.",
                  behavior: "The task is safely archived from the production view but triggers a billing ticket or pipeline alert inside the Finance & Invoicing module for administrative collection."
                },
                { 
                  name: "Completed", 
                  color: "bg-green-100 text-green-800 border-green-200", 
                  meaning: "The ultimate green light. The work is filed, reviewed, and administrative/financial protocols are fully settled.",
                  behavior: "The task is moved to historical archives. The assigned staff's resource capacity bar drops down, showing the system they are free to accept a new engagement."
                }
              ].map((def, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 border rounded-xl bg-card hover:bg-muted/10 transition-colors">
                  <div className="md:w-64 flex-shrink-0 flex items-start">
                    <span className={cn("px-2.5 py-1 rounded text-xs font-bold border", def.color)}>{def.name}</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-xs">
                      <span className="font-bold text-primary mr-1">System Meaning:</span>
                      <span className="text-muted-foreground">{def.meaning}</span>
                    </div>
                    <div className="text-xs border-t pt-1.5 border-border/40">
                      <span className="font-bold text-[#1b4d3e] mr-1">Operational Behavior:</span>
                      <span className="text-muted-foreground">{def.behavior}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SUB-VIEW: BUSINESS HOURS Timings */}
      {/* ======================================================== */}
      {activeView === "business-hours" && (
        <div className="bg-card border rounded-xl p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-lg font-bold text-[#1b4d3e] flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Business timing hours config
          </h2>
          <form className="space-y-4 max-w-md" onSubmit={(e) => { e.preventDefault(); toast.success("Business Hours configuration saved!"); }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-muted-foreground">Office Starts At</label>
                <input type="time" defaultValue="09:30" className="w-full p-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-muted-foreground">Office Ends At</label>
                <input type="time" defaultValue="18:30" className="w-full p-2 border rounded-md text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-muted-foreground">Standard Weekly Offs</label>
              <div className="flex gap-2 flex-wrap pt-1">
                {["Sunday", "Second Saturday", "Fourth Saturday"].map((off, idx) => (
                  <span key={idx} className="px-3 py-1 bg-[#1b4d3e]/10 text-[#1b4d3e] text-xs font-semibold rounded-full border border-[#1b4d3e]/20">
                    {off}
                  </span>
                ))}
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-[#1b4d3e] hover:bg-emerald-950 text-white rounded-md text-xs font-bold transition-colors">
              Save timings
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. SUB-VIEW: FIRM HOLIDAY CALENDAR */}
      {/* ======================================================== */}
      {activeView === "holidays" && (
        <div className="bg-card border rounded-xl p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1b4d3e]" />
              Holiday Calendar ({holidays.length})
            </h2>
            <button 
              onClick={() => setIsHolidayModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1b4d3e] text-white rounded-md hover:bg-emerald-950 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Holiday
            </button>
          </div>

          <div className="border rounded-xl overflow-hidden bg-card/30">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-bold border-b">
                <tr>
                  <th className="px-4 py-3">Holiday Name</th>
                  <th className="px-4 py-3">Scheduled Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-bold text-[#1b4d3e]">{h.name}</td>
                    <td className="px-4 py-4 font-semibold text-xs font-mono">{h.date}</td>
                    <td className="px-4 py-4">
                      {h.isNational ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 rounded text-[10px] font-bold border border-red-200">
                          National Holiday
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 rounded text-[10px] font-bold border border-sky-200">
                          Regional Holiday
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => {
                          const filtered = holidays.filter(val => val.id !== h.id);
                          setHolidays(filtered);
                          localStorage.setItem("ca_holidays", JSON.stringify(filtered));
                          toast.success("Holiday removed");
                        }}
                        className="p-1 hover:bg-muted rounded text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. SUB-VIEW: LEAVES CONFIGURATION */}
      {/* ======================================================== */}
      {activeView === "leaves" && (
        <div className="bg-card border rounded-xl p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-lg font-bold text-[#1b4d3e] flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Leaves Allotment Policies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { type: "Casual Leave (CL)", annual: 12, maxConsecutive: 3, decr: "Accrues 1 per month of active operations." },
              { type: "Sick Leave (SL)", annual: 8, maxConsecutive: 2, decr: "Provided for health and medical recuperation." },
              { type: "Earned Leave (EL)", annual: 15, maxConsecutive: 10, decr: "Accumulated leaves based on overall annual billing attendance." }
            ].map((lv, idx) => (
              <div key={idx} className="p-5 border rounded-2xl bg-card/40 space-y-4">
                <span className="font-bold text-sm text-[#1b4d3e]">{lv.type}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{lv.annual}</span>
                  <span className="text-xs text-muted-foreground font-semibold">days / year</span>
                </div>
                <div className="text-xs text-muted-foreground">{lv.decr}</div>
                <div className="text-[10px] font-bold text-primary bg-muted p-2 rounded-md">
                  🛡️ Max Consecutive: {lv.maxConsecutive} days
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. SUB-VIEW: MODULES ACTIVATION */}
      {/* ======================================================== */}
      {activeView === "modules" && (
        <div className="bg-card border rounded-xl p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-lg font-bold text-[#1b4d3e] flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Toggle Core App Modules
          </h2>
          <p className="text-xs text-muted-foreground max-w-xl">
            Toggle which features are enabled in the CA Practice suite. Disabling a module hides it safely from the sidebar for non-admin users.
          </p>
          <div className="space-y-4 max-w-xl pt-2">
            {[
              { id: "leads", name: "Leads Dashboard & Sales CRM", desc: "Monitors pipeline value, lead scoring, and convert to clients button." },
              { id: "pass", name: "Vault Password Vault Hub", desc: "Encrypted, client portal login storage whitelisted for seniors." },
              { id: "billing", name: "Client Invoicing & Fees Module", desc: "Automates proforma generation and payment trackers." },
              { id: "hr", name: "Employee HR & Leaves Portal", desc: "Manages junior leaves, timesheets, and biometric logins." },
              { id: "timesheet_compliance", name: "Timesheet & Task Timer Compliance", desc: "Enforces daily clock-in checks, tracks stopwatch activity, and logs daily billable hours." },
              { id: "whatsapp", name: "WhatsApp Reminders Integration", desc: "Auto-sends notice expiry dates and fee reminders." }
            ].map((mod) => (
              <div key={mod.id} className="flex items-start justify-between p-4 border rounded-xl bg-card/20 hover:border-[#1b4d3e]/30 transition-colors">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#1b4d3e]">{mod.name}</div>
                  <div className="text-xs text-muted-foreground">{mod.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalModules[mod.id] || false}
                    className="w-4 h-4 rounded text-[#1b4d3e] focus:ring-[#1b4d3e] cursor-pointer"
                    onChange={() => {
                      const nextVal = !globalModules[mod.id];
                      const updated = {
                        ...globalModules,
                        [mod.id]: nextVal
                      };
                      setGlobalModules(updated);
                      localStorage.setItem("prabandh_global_modules", JSON.stringify(updated));
                      toast.success(`Module '${mod.name}' globally ${nextVal ? "enabled" : "disabled"}`);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SLIDEOVER MODALS */}
      {/* ======================================================== */}
      
      {/* 1. Add / Edit Billing Organization Modal */}
      <SlideOver
        open={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        title={editingOrg ? "Edit Billing Organization" : "Add Billing Organization"}
      >
        <form onSubmit={handleOrgSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Organization Name *</label>
            <input 
              name="name" 
              required 
              defaultValue={editingOrg?.name || ""}
              placeholder="e.g. Varish Partners"
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">GSTIN Number</label>
            <input 
              name="gstin" 
              defaultValue={editingOrg?.gstin || ""}
              placeholder="e.g. 27AAAAA0000A1Z5"
              className="w-full p-2.5 border rounded-lg text-sm uppercase bg-background text-foreground" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Address</label>
            <textarea 
              name="address" 
              rows={3}
              defaultValue={editingOrg?.address || ""}
              placeholder="Office address details..."
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground" 
            />
          </div>
          <div className="pt-6 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsOrgModalOpen(false)} 
              className="px-4 py-2 border rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors"
            >
              {editingOrg ? "Save Changes" : "Create Organization"}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* 2. Add / Edit Department Modal */}
      <SlideOver
        open={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDept ? "Edit Department" : "Add CA Department"}
      >
        <form onSubmit={handleDeptSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Department Name *</label>
            <input 
              name="name" 
              required 
              defaultValue={editingDept?.name || ""}
              placeholder="e.g. Indirect Tax (GST)"
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Department Code (3 characters) *</label>
            <input 
              name="code" 
              required 
              maxLength={3}
              defaultValue={editingDept?.code || ""}
              placeholder="e.g. IDT"
              className="w-full p-2.5 border rounded-lg text-sm uppercase bg-background text-foreground" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Is this a Core Delivery department?</label>
            <select 
              name="isCore" 
              defaultValue={editingDept?.isCoreDelivery ? "true" : "false"}
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground"
            >
              <option value="true">Yes — Client Audit / Tax Delivery</option>
              <option value="false">No — Internal Admin / Accounts</option>
            </select>
          </div>
          <div className="pt-6 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsDeptModalOpen(false)} 
              className="px-4 py-2 border rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors"
            >
              {editingDept ? "Save Department" : "Create Department"}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* 3. Add Holiday Modal */}
      <SlideOver
        open={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Add Firm Holiday"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const data = new FormData(form);
          const name = data.get("name") as string;
          const date = data.get("date") as string;
          const isNational = data.get("isNational") === "true";

          const newH: Holiday = {
            id: Math.random().toString(36).substring(7),
            name,
            date,
            isNational
          };
          const updated = [...holidays, newH].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setHolidays(updated);
          localStorage.setItem("ca_holidays", JSON.stringify(updated));
          toast.success("Holiday scheduled");
          setIsHolidayModalOpen(false);
        }} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Holiday Name *</label>
            <input name="name" required placeholder="e.g. Independence Day" className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Scheduled Date *</label>
            <input name="date" type="date" required className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Holiday Type</label>
            <select name="isNational" className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground">
              <option value="true">National Holiday (Office Closed)</option>
              <option value="false">Regional Holiday</option>
            </select>
          </div>
          <div className="pt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setIsHolidayModalOpen(false)} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors">Schedule Holiday</button>
          </div>
        </form>
      </SlideOver>

      {/* 4. Add / Edit Permission Matrix Row Modal */}
      <SlideOver
        open={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        title={editingMatrixRow ? "Edit Permission Module" : "Add Permission Module"}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const data = new FormData(form);
          const moduleName = data.get("moduleName") as string;
          const description = data.get("description") as string;
          const partner = data.get("partner") as string;
          const manager = data.get("manager") as string;
          const article = data.get("article") as string;
          const finance = data.get("finance") as string;
          const hr = data.get("hr") as string;

          if (editingMatrixRow) {
            // Edit mode
            const updated = matrix.map(row => {
              if (row.id === editingMatrixRow.id) {
                return {
                  ...row,
                  module: moduleName,
                  description,
                  partner,
                  manager,
                  article,
                  finance,
                  hr
                };
              }
              return row;
            });
            setMatrix(updated);
            localStorage.setItem("ca_permission_matrix", JSON.stringify(updated));
            toast.success("Permission module details updated");
          } else {
            // Add mode
            const newRow: PermissionRow = {
              id: Math.random().toString(36).substring(7),
              module: moduleName,
              description,
              partner,
              manager,
              article,
              finance,
              hr,
              isCustom: true
            };
            const updated = [...matrix, newRow];
            setMatrix(updated);
            localStorage.setItem("ca_permission_matrix", JSON.stringify(updated));
            toast.success("Custom permission module added successfully");
          }
          setIsMatrixModalOpen(false);
          setEditingMatrixRow(null);
        }} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Module / Feature Name *</label>
            <input 
              name="moduleName" 
              required 
              defaultValue={editingMatrixRow?.module || ""}
              placeholder="e.g. Indirect Tax Appeals" 
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description *</label>
            <textarea 
              name="description" 
              required
              rows={3}
              defaultValue={editingMatrixRow?.description || ""}
              placeholder="Explain what this module controls and accesses..." 
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground" 
            />
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Set Default Permissions</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Partner / Director</label>
                <select name="partner" defaultValue={editingMatrixRow?.partner || "Full CRUD (Global)"} className="w-full p-2 border rounded-md text-xs bg-background text-foreground">
                  {commonPermissions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Manager / Asst. Manager</label>
                <select name="manager" defaultValue={editingMatrixRow?.manager || "Create, Read, Update (Global)"} className="w-full p-2 border rounded-md text-xs bg-background text-foreground">
                  {commonPermissions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
 
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Article Clerk / Intern</label>
                <select name="article" defaultValue={editingMatrixRow?.article || "Read Only (Assigned Only)"} className="w-full p-2 border rounded-md text-xs bg-background text-foreground">
                  {commonPermissions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Finance & Billing Admin</label>
                <select name="finance" defaultValue={editingMatrixRow?.finance || "No Access"} className="w-full p-2 border rounded-md text-xs bg-background text-foreground">
                  {commonPermissions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase font-semibold">HR & Admin Dept / Role</label>
                <select name="hr" defaultValue={editingMatrixRow?.hr || "No Access"} className="w-full p-2 border rounded-md text-xs bg-background text-foreground">
                  {commonPermissions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="pt-6 flex justify-end gap-2 border-t">
            <button 
              type="button" 
              onClick={() => { setIsMatrixModalOpen(false); setEditingMatrixRow(null); }} 
              className="px-4 py-2 border rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors"
            >
              {editingMatrixRow ? "Save Details" : "Create Module"}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* 5. Add / Edit Custom Sub-status Modal */}
      <SlideOver
        open={isSubStatusModalOpen}
        onClose={() => { setIsSubStatusModalOpen(false); setEditingSubStatus(null); }}
        title={editingSubStatus ? "Edit Custom Sub-status" : "Add Custom Sub-status"}
      >
        <form onSubmit={handleSubStatusSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Sub-status Name *</label>
            <input 
              required
              value={subStatusName}
              onChange={(e) => setSubStatusName(e.target.value)}
              placeholder="e.g. Queries Raised" 
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Visual Theme / Color</label>
            <select 
              value={subStatusColor}
              onChange={(e) => setSubStatusColor(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground"
            >
              <option value="bg-blue-100 text-blue-800 border-blue-200">Blue (Standard - In Progress)</option>
              <option value="bg-amber-100 text-amber-800 border-amber-200">Amber (Warning - Pending)</option>
              <option value="bg-red-100 text-red-800 border-red-200">Red (Urgent - Queries)</option>
              <option value="bg-purple-100 text-purple-800 border-purple-200">Purple (Awaiting Sign-off)</option>
              <option value="bg-indigo-100 text-indigo-800 border-indigo-200">Indigo (Under Review)</option>
              <option value="bg-green-100 text-green-800 border-green-200">Green (Completed)</option>
              <option value="bg-[#fee2e2] text-[#991b1b] border-[#991b1b]/20">High Contrast Red (Review Rejected)</option>
              <option value="bg-[#dbeafe] text-[#1e40af] border-[#1e40af]/20">High Contrast Blue (Peer Review)</option>
              <option value="bg-[#fef3c7] text-[#92400e] border-[#92400e]/20">High Contrast Amber (Mgmt Signoff)</option>
              <option value="bg-[#ffedd5] text-[#c2410c] border-[#c2410c]/20">High Contrast Orange (Portal Glitch)</option>
              <option value="bg-[#d1fae5] text-[#065f46] border-[#065f46]/20">High Contrast Emerald (Filed - Billing Pending)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Operational Meaning / Description</label>
            <textarea 
              value={subStatusDescription}
              onChange={(e) => setSubStatusDescription(e.target.value)}
              placeholder="Provide a workflow explanation for the team..." 
              rows={3}
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20 resize-none" 
            />
          </div>
          
          <div className="pt-6 flex justify-end gap-2 border-t mt-4">
            <button 
              type="button" 
              onClick={() => { setIsSubStatusModalOpen(false); setEditingSubStatus(null); }} 
              className="px-4 py-2 border rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors"
            >
              {editingSubStatus ? "Save Changes" : "Create Sub-status"}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* 6. SUB-VIEW: CA FIRM VERTICALS & BRANCHES CRUD */}
      {activeView === "firm-groups" && (
        <div className="bg-card border rounded-xl p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#1b4d3e]" />
              CA Firm Verticals & Branches
            </h2>
            <button
              onClick={() => {
                setEditingFirmGroup(null);
                setFirmGroupName("");
                setFirmGroupHeadId("");
                setFirmGroupEmployeeIds([]);
                setIsFirmGroupModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1b4d3e] text-white rounded-md hover:bg-emerald-950 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Vertical / Branch
            </button>
          </div>

          <div className="border rounded-xl overflow-hidden bg-card/30">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-bold border-b">
                <tr>
                  <th className="px-4 py-3">Vertical/Branch Name</th>
                  <th className="px-4 py-3">Lead Manager / Group Head</th>
                  <th className="px-4 py-3">Mapped Employees</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {firmGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-xs text-muted-foreground italic">
                      No verticals or branches configured. Click 'Add Vertical / Branch' to get started.
                    </td>
                  </tr>
                ) : (
                  firmGroups.map((fg) => {
                    const headUser = users.find(u => u.id === fg.headId);
                    const headName = headUser ? `${headUser.name} (${headUser.role})` : "— Not Assigned —";
                    const mappedCount = fg.employeeIds ? fg.employeeIds.length : 0;
                    return (
                      <tr key={fg.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 font-bold text-[#1b4d3e]">{fg.name}</td>
                        <td className="px-4 py-4 text-xs font-medium">{headName}</td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-0.5 bg-[#1b4d3e]/10 text-[#1b4d3e] rounded-full text-xs font-semibold border border-[#1b4d3e]/20">
                            {mappedCount} Staff Members
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingFirmGroup(fg);
                                setFirmGroupName(fg.name);
                                setFirmGroupHeadId(fg.headId || "");
                                setFirmGroupEmployeeIds(fg.employeeIds || []);
                                setIsFirmGroupModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-muted rounded-md text-primary"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteFirmGroup(fg.id)}
                              className="p-1.5 hover:bg-muted rounded-md text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* X. SUB-VIEW: SUBSCRIPTION & DASHBOARD */}
      {/* ======================================================== */}
      {activeView === "subscription" && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {/* Banner Section */}
          <div className="bg-gradient-to-r from-[#1b4d3e] to-emerald-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <CreditCard className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-4 max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm border border-white/30 shadow-sm">
                  Lifetime Free Access Enabled
                </span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">Community Growth Plan</h2>
              <p className="text-emerald-50 text-sm leading-relaxed max-w-2xl">
                Enjoy the service and manage your firm well! The core practice management tools are completely on us. In the future, when we introduce advanced automated premium value-added integrations, you can choose what to activate.
              </p>
            </div>
          </div>

          {/* Usage Metrics Section */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-[#1b4d3e] text-lg mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Current Usage Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Active Seats", current: users.length || 1, limit: "Unlimited", icon: UserCheck, color: "bg-blue-500" },
                { label: "Total Clients", current: 50, limit: "Unlimited", icon: Users, color: "bg-emerald-500" },
                { label: "Tasks Managed", current: 500, limit: "Unlimited", icon: CheckSquare, color: "bg-indigo-500" }
              ].map((metric, i) => (
                <div key={i} className="border rounded-xl p-5 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <metric.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{metric.limit} limit</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-primary">{metric.current}</div>
                    <div className="text-sm font-semibold text-muted-foreground">{metric.label}</div>
                  </div>
                  <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full w-full opacity-60", metric.color)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Power Extensions / AI Agents Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
            
            {/* Left: Power Extensions */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col h-full">
              <h3 className="font-bold text-[#1b4d3e] text-lg mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Power Extensions
              </h3>
              <p className="text-xs text-muted-foreground mb-6">Upcoming premium integrations to supercharge your workflow.</p>
              
              <div className="space-y-4 flex-1">
                {[
                  { name: "WhatsApp API Gateway", desc: "Automate client reminders, doc requests, and billing alerts.", icon: PhoneCall },
                  { name: "Tax Portal Integrations", desc: "Direct sync with IT & GST portals for 1-click downloads.", icon: Globe },
                  { name: "Advanced WIP Billing", desc: "Real-time cost analysis and complex timesheet-to-invoice flows.", icon: CreditCard }
                ].map((ext, i) => (
                  <div key={i} className="border border-dashed rounded-xl p-4 flex items-start gap-4 opacity-60 hover:opacity-100 transition-opacity bg-muted/20 cursor-not-allowed">
                    <div className="bg-background border rounded-lg p-2 mt-1">
                      <ext.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-bold text-primary flex items-center gap-2 text-sm">
                        {ext.name}
                        <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold text-muted-foreground">Roadmap</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{ext.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Agent Add-ons */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <h3 className="font-bold text-indigo-700 dark:text-indigo-400 text-lg mb-2 flex items-center gap-2 relative z-10">
                <Cpu className="w-5 h-5" />
                AI Agent Add-ons
              </h3>
              <p className="text-xs text-muted-foreground mb-6 relative z-10">Deploy autonomous agents to drastically reduce manual compliance work.</p>
              
              <div className="space-y-4 flex-1 relative z-10">
                {[
                  { name: "Tax Auditing Agent", desc: "Auto-analyzes trial balances and highlights 3CD reporting anomalies." },
                  { name: "Bookkeeping Agent", desc: "Reconciles bank statements against ledgers with 98% accuracy." },
                  { name: "GSTR-3B Reconciliation", desc: "Instantly matches GSTR-2B vs purchase registers and flags missing ITCs." },
                  { name: "Notice Reply Drafter", desc: "Drafts precise, section-referenced responses to IT department notices." }
                ].map((agent, i) => (
                  <div key={i} className="border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 flex flex-col justify-center bg-indigo-50/30 dark:bg-indigo-950/20 opacity-80 hover:opacity-100 transition-opacity cursor-not-allowed">
                    <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center justify-between text-sm">
                      {agent.name}
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase font-bold">Coming Soon</span>
                    </div>
                    <div className="text-xs text-indigo-700/70 dark:text-indigo-400/70 mt-1">{agent.desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. Add / Edit Firm Group Modal */}
      <SlideOver
        open={isFirmGroupModalOpen}
        onClose={() => {
          setIsFirmGroupModalOpen(false);
          setEditingFirmGroup(null);
          setFirmGroupName("");
          setFirmGroupHeadId("");
          setFirmGroupEmployeeIds([]);
        }}
        title={editingFirmGroup ? "Edit Firm Vertical / Branch" : "Add Firm Vertical / Branch"}
      >
        <form onSubmit={handleFirmGroupSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Vertical / Branch Name *</label>
            <input
              required
              value={firmGroupName}
              onChange={(e) => setFirmGroupName(e.target.value)}
              placeholder="e.g. Corporate Taxation - Team Alpha"
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Group Head / Lead Manager *</label>
            <select
              required
              value={firmGroupHeadId}
              onChange={(e) => setFirmGroupHeadId(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-sm bg-background text-foreground"
            >
              <option value="">— Select Lead Manager —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Map Employees</label>
            <div className="border rounded-lg max-h-48 overflow-y-auto p-2 bg-background space-y-1">
              {users.length === 0 ? (
                <div className="text-xs text-muted-foreground italic p-2">No employees available</div>
              ) : (
                users.map(u => {
                  const isChecked = firmGroupEmployeeIds.includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2.5 hover:bg-muted/40 p-1.5 rounded cursor-pointer transition-colors text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setFirmGroupEmployeeIds(firmGroupEmployeeIds.filter(id => id !== u.id));
                          } else {
                            setFirmGroupEmployeeIds([...firmGroupEmployeeIds, u.id]);
                          }
                        }}
                        className="rounded text-[#1b4d3e] focus:ring-[#1b4d3e] w-4 h-4"
                      />
                      <span>{u.name} ({u.role})</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-2 border-t mt-4">
            <button
              type="button"
              onClick={() => {
                setIsFirmGroupModalOpen(false);
                setEditingFirmGroup(null);
                setFirmGroupName("");
                setFirmGroupHeadId("");
                setFirmGroupEmployeeIds([]);
              }}
              className="px-4 py-2 border rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1b4d3e] text-white rounded-lg text-xs font-semibold hover:bg-emerald-950 transition-colors"
            >
              {editingFirmGroup ? "Save Vertical" : "Create Vertical"}
            </button>
          </div>
        </form>
      </SlideOver>

    </div>
  );
}

