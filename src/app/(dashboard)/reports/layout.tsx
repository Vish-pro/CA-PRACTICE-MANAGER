"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState("CLERK");

  useEffect(() => {
    const checkRole = () => {
      const stored = localStorage.getItem("prabandh_simulated_role");
      if (stored) {
        setRole(stored);
      } else {
        setRole("CLERK");
      }
    };
    checkRole();
    window.addEventListener("storage", checkRole);
    window.addEventListener("role-change", checkRole as EventListener);
    return () => {
      window.removeEventListener("storage", checkRole);
      window.removeEventListener("role-change", checkRole as EventListener);
    };
  }, []);

  const isHrOrPartner = role === "HR" || role === "ADMIN" || role === "PARTNER" || role === "DIRECTOR";

  const tabs = [
    { label: "Leads & Pipeline", href: "/reports/leads-pipeline" },
    { label: "Financial",        href: "/reports/financial" },
    { label: "Tasks",            href: "/reports/tasks" },
    { label: "Billing & Revenue", href: "/reports/billing" },
    { label: "Operations",        href: "/reports/operations" },
    { label: "Access Logs",       href: "/reports/access-logs" },
    { label: "Employee Analytics", href: "/reports/employee" },
    ...(isHrOrPartner ? [{ label: "HR & Staffing", href: "/reports/hr" }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Analytics and insights across your firm.</p>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              pathname.startsWith(tab.href)
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {children}
    </div>
  );
}
