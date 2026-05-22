"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CheckSquare, FileText, Mail, PieChart, UserCircle, LogOut, Target, MessageSquare, ClipboardList, Briefcase, Key, UserPlus, Shield, FileCheck, Lock, Inbox, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";

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
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

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
            {sidebarLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              const Icon = link.icon;
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
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Placeholder */}
        <header className="h-16 border-b flex items-center px-6 justify-end bg-card">
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-semibold">{session?.user?.name || "User"}</div>
              <div className="text-xs text-muted-foreground capitalize">{session?.user?.role?.toLowerCase() || "Role"}</div>
            </div>
            <Avatar name={session?.user?.name || "User"} size="md" />
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