"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CheckSquare, FileText, Mail, PieChart, UserCircle, LogOut, Target, MessageSquare, ClipboardList, Briefcase, Key, UserPlus, Shield, FileCheck, Lock, Inbox, UserCog, Settings, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "react-hot-toast";

function useAttendanceTimer(checkInTimestamp: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!checkInTimestamp) return;
    const calcElapsed = () => Math.max(0, Date.now() - checkInTimestamp);
    setElapsed(calcElapsed());

    const interval = setInterval(() => {
      setElapsed(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [checkInTimestamp]);

  if (!checkInTimestamp) {
    return { timeString: "00:00:00", isOvertime: false };
  }

  const seconds = Math.floor((elapsed / 1000) % 60);
  const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
  const hours = Math.floor(elapsed / (1000 * 3600));

  const pad = (num: number) => String(num).padStart(2, "0");
  const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const isOvertime = hours >= 8;

  return { timeString, isOvertime };
}

function AttendanceTimer({ checkInTimestamp }: { checkInTimestamp: number | null }) {
  const { timeString, isOvertime } = useAttendanceTimer(checkInTimestamp);

  if (!checkInTimestamp) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-950/40 text-xs font-bold shadow-sm bg-red-50/50 dark:bg-red-950/10 text-red-600 dark:text-red-400 transition-all duration-300"
        title="Attendance Session: Checked Out"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-[10px] tracking-wider uppercase">Checked Out</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-all duration-300",
        isOvertime 
          ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 animate-pulse" 
          : "bg-[#1b4d3e]/5 dark:bg-[#1b4d3e]/10 text-[#1b4d3e] dark:text-emerald-400 border-[#1b4d3e]/10"
      )}
      title={isOvertime ? "Overtime Warning: Clock exceeds 8 hrs" : "Active Attendance Session"}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <Timer className={cn("w-3.5 h-3.5", isOvertime ? "text-red-500 animate-bounce" : "text-[#1b4d3e] dark:text-emerald-400")} />
      <span className="font-mono text-sm tracking-wider">{timeString}</span>
      {isOvertime && (
        <span className="bg-red-600 text-white font-bold text-[8px] px-1 py-0.5 rounded leading-none uppercase">
          OT
        </span>
      )}
    </div>
  );
}

const sidebarLinks = [
  { name: "Home", href: "/action-center", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: UserPlus },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Services", href: "/services", icon: Briefcase },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Invoice", href: "/billing/invoices", icon: FileText },
  { name: "DSC", href: "/registers/dsc", icon: Shield },
  { name: "Licenses", href: "/registers/licenses", icon: FileCheck },
  { name: "Passwords", href: "/registers/passwords", icon: Lock },
  { name: "Doc Inbox", href: "/documents", icon: Inbox },
  { name: "HR & Team", href: "/hr", icon: UserCog },
  { name: "Reports", href: "/reports", icon: PieChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

function isLinkLocked(role: string, linkName: string): { locked: boolean; reason: string } {
  const normalizedRole = role.toUpperCase();

  // Partners / Admins / Directors bypass all operational module locks
  if (normalizedRole === "ADMIN" || normalizedRole === "PARTNER" || normalizedRole === "DIRECTOR") {
    return { locked: false, reason: "" };
  }

  // 1. HR Specialization Lockouts
  if (normalizedRole === "HR") {
    const allowed = ["Home", "HR & Team"];
    if (!allowed.includes(linkName)) {
      return { 
        locked: true, 
        reason: "Access Denied: As an HR specialist, your workspace is dedicated to recruitment, employees, org hierarchy, and team management. Other operational modules are locked." 
      };
    }
  }

  // 2. Finance / Billing Department Lockouts
  if (normalizedRole === "FINANCE" || normalizedRole === "BILLING") {
    const allowed = ["Home", "Invoice", "HR & Team", "Reports", "Settings"];
    if (!allowed.includes(linkName)) {
      return { 
        locked: true, 
        reason: `Access Denied: As a Finance & Billing officer, your workspace is focused on invoices, receivables, and financial reports. '${linkName}' is locked.` 
      };
    }
  }

  // 3. Clerk / Article Assistant / Intern Lockouts
  if (normalizedRole === "CLERK" || normalizedRole === "ARTICLE" || normalizedRole === "INTERN") {
    const blocked = ["Invoice", "Reports", "Settings"];
    if (blocked.includes(linkName)) {
      return { 
        locked: true, 
        reason: `Access Denied: As an Article / Clerk Assistant, your workspace is focused on task execution. Master '${linkName}' access is restricted under RBAC rules.` 
      };
    }
  }

  // 4. Manager / HOD Supervisor Lockouts
  if (normalizedRole === "MANAGER" || normalizedRole === "SENIOR_STAFF") {
    const blocked = ["Settings"];
    if (blocked.includes(linkName)) {
      return { 
        locked: true, 
        reason: `Access Denied: As a Department HOD, master settings and global system RBAC configurations are locked. Contact Admin Partners for revisions.` 
      };
    }
  }

  return { locked: false, reason: "" };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [checkInTime, setCheckInTime] = useState<number | null>(null);
  const [globalModules, setGlobalModules] = useState<Record<string, boolean>>({
    leads: true,
    pass: true,
    billing: true,
    hr: true,
    whatsapp: false,
    timesheet_compliance: true
  });

  const [userRole, setUserRole] = useState<string>("CLERK");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateAttendanceState = () => {
        const status = localStorage.getItem("ca_attendance_status") || "OUT";
        const storedTime = localStorage.getItem("prabandh_login_timestamp");
        if (status === "IN" && storedTime) {
          setCheckInTime(parseInt(storedTime, 10));
        } else {
          setCheckInTime(null);
        }
      };

      updateAttendanceState();
      window.addEventListener("storage", updateAttendanceState);
      window.addEventListener("attendance-change", updateAttendanceState as EventListener);

      const storedModules = localStorage.getItem("prabandh_global_modules");
      if (storedModules) {
        const parsed = JSON.parse(storedModules);
        if (parsed.timesheet_compliance === undefined) {
          parsed.timesheet_compliance = true;
        }
        setGlobalModules(parsed);
      }

      const storedRole = localStorage.getItem("prabandh_simulated_role");
      if (storedRole) {
        setUserRole(storedRole);
      } else if (session?.user?.role) {
        setUserRole(session.user.role);
      }

      return () => {
        window.removeEventListener("storage", updateAttendanceState);
        window.removeEventListener("attendance-change", updateAttendanceState as EventListener);
      };
    }
  }, [session]);

  const handleRoleChange = (newRole: string) => {
    setUserRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("prabandh_simulated_role", newRole);
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("role-change", { detail: newRole }));
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("prabandh_login_timestamp");
      localStorage.removeItem("prabandh_simulated_role");
    }
    signOut({ callbackUrl: "/login" });
  };

  const isAdmin = userRole === "ADMIN" || userRole === "PARTNER" || userRole === "DIRECTOR";

  // Filter sidebar links based on Stage 1 (Global Master Switch) checks. Stage 2 (RBAC locks) is represented via padlocks.
  const filteredLinks = sidebarLinks.filter((link) => {
    // 1. Stage 1: The Managing Partner's Master Switch Checks
    if (link.name === "Leads" && !globalModules.leads && !isAdmin) return false;
    if (link.name === "Passwords" && !globalModules.pass && !isAdmin) return false;
    if (link.name === "Invoice" && !globalModules.billing && !isAdmin) return false;
    if (link.name === "HR & Team" && !globalModules.hr && !isAdmin) return false;

    return true;
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <LayoutDashboard className="w-6 h-6 text-primary mr-2" />
          <span className="font-bold text-lg tracking-tight text-primary">Prabandh</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {filteredLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              const Icon = link.icon;

              // Check if link is locked for this role
              const lockInfo = isLinkLocked(userRole, link.name);

              if (lockInfo.locked) {
                return (
                  <li key={link.href}>
                    <button
                      onClick={() => {
                        toast.error(
                          lockInfo.reason,
                          {
                            duration: 4000,
                            position: "top-right",
                            style: {
                              background: "#1f2937",
                              color: "#fff",
                              fontSize: "12px",
                              border: "1px solid #374151",
                            }
                          }
                        );
                      }}
                      className={cn(
                        "flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors opacity-40 hover:opacity-50 cursor-not-allowed text-muted-foreground hover:bg-transparent"
                      )}
                    >
                      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span>{link.name}</span>
                      <Lock className="w-3.5 h-3.5 ml-auto text-muted-foreground/60" />
                    </button>
                  </li>
                );
              }

              // Check if this link is currently globally disabled by Admin, but visible to Admin.
              const isGloballyDisabled = 
                (link.name === "Leads" && !globalModules.leads) ||
                (link.name === "Passwords" && !globalModules.pass) ||
                (link.name === "Invoice" && !globalModules.billing) ||
                (link.name === "HR & Team" && !globalModules.hr);

              if (isGloballyDisabled && isAdmin) {
                return (
                  <li key={link.href}>
                    <button
                      onClick={() => {
                        alert(`This module is currently deactivated at the platform level.\n\nPlease navigate to:\nSettings -> Toggle Core App Modules\nto activate it.`);
                      }}
                      className={cn(
                        "flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors opacity-60 hover:opacity-100",
                        isActive
                          ? "bg-primary/20 text-muted-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {link.name} <span className="ml-auto text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">Off</span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b flex items-center px-6 justify-end bg-card">
          <div className="flex items-center space-x-4">
            
            {/* Simulated Role Tester Switcher */}
            <div className="flex items-center gap-2 border-r pr-4 border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Simulate Role:</span>
              <select
                value={userRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="bg-muted hover:bg-muted/80 text-foreground border border-border rounded px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all uppercase"
              >
                <option value="ADMIN">Partner (Admin)</option>
                <option value="HR">HR Officer</option>
                <option value="ARTICLE">Article Assistant</option>
                <option value="MANAGER">Manager (HOD)</option>
              </select>
            </div>

            {/* Attendance Timer */}
            <AttendanceTimer checkInTimestamp={checkInTime} />

            {/* Profile Block */}
            <div className="flex items-center space-x-3 pl-4 border-l">
              <div className="text-right">
                <div className="text-sm font-semibold">{session?.user?.name || "User"}</div>
                <div className="text-xs text-muted-foreground capitalize">{userRole.toLowerCase()}</div>
              </div>
              <Avatar name={session?.user?.name || "User"} size="md" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}