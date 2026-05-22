"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Leads & Pipeline", href: "/reports/leads-pipeline" },
  { label: "Financial",        href: "/reports/financial" },
  { label: "Tasks",            href: "/reports/tasks" },
  { label: "Billing & Revenue", href: "/reports/billing" },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}
