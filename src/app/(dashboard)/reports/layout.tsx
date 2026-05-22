"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Leads & Pipeline", href: "/reports/leads-pipeline" },
  { label: "Financial",        href: "/reports/financial" },
  { label: "Tasks",            href: "/reports/tasks" },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Analytics and insights across your firm.</p>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border">
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
