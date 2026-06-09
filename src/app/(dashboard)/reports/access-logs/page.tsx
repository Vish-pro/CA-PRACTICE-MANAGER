"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, Search, RefreshCw, Key, Download, Ban } from "lucide-react";

export default function AccessLogsPage() {
  const { data: session } = useSession();
  const [logSearch, setLogSearch] = useState("");
  const [logModuleFilter, setLogModuleFilter] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("");

  const userRole = session?.user?.role || "STAFF";
  // ONLY ADMIN (Partner/Director tier) has access
  const hasAccess = userRole === "ADMIN";

  const logs = [
    { time: "2026-05-25 12:44:18", actor: "Admin Partner", role: "Partner", module: "System", action: "Updated Access Matrix (DSC Module)", ip: "192.168.1.1 (Office Main)", status: "SUCCESS", statusLabel: "Success" },
    { time: "2026-05-25 12:42:05", actor: "Article Clerk (GST)", role: "Article", module: "Clients", action: "Attempted View: Client Financials (TechFlow)", ip: "192.168.1.45 (Remote)", status: "FAILED", statusLabel: "Failed (Blocked)" },
    { time: "2026-05-25 12:35:12", actor: "Manager (Audit)", role: "Manager", module: "Tasks", action: "Approved Audit checklist (TechFlow)", ip: "192.168.1.20 (Office GST)", status: "SUCCESS", statusLabel: "Success" },
    { time: "2026-05-25 12:15:40", actor: "Article Clerk (Audit)", role: "Article", module: "Vault", action: "Downloaded DSC token file (Global Trade)", ip: "192.168.1.15 (Office Audit)", status: "SUCCESS", statusLabel: "Success" },
    { time: "2026-05-25 11:58:02", actor: "Billing Admin", role: "Finance", module: "Billing", action: "Generated Invoice (TechFlow GST)", ip: "192.168.1.5 (Billing Bay)", status: "SUCCESS", statusLabel: "Success" },
    { time: "2026-05-25 11:40:50", actor: "Director (Direct Tax)", role: "Director", module: "Vault", action: "Accessed IT Portal password (TechFlow)", ip: "192.168.1.2 (Tax Cell)", status: "SUCCESS", statusLabel: "Success" },
    { time: "2026-05-25 10:22:15", actor: "Article Clerk (Audit)", role: "Article", module: "Clients", action: "Attempted Delete: Audit Report draft", ip: "192.168.1.15 (Office Audit)", status: "FAILED", statusLabel: "Failed (Blocked)" }
  ];

  if (!hasAccess) {
    return (
      <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-4 my-10 shadow-sm">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Ban className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-red-800 dark:text-red-400">Access Silo Rule: Access Denied</h2>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 leading-relaxed">
          Your current active tier role <strong>({userRole})</strong> does not possess the required credentials to view the System Audit and Security Access Logs. 
          As configured in the <strong>Master Role Permissions Matrix</strong>, only Partners and Directors possess <strong>Full CRUD</strong> authorization for the Access Logs module.
        </p>
        <div className="pt-2">
          <span className="inline-block text-xs font-mono bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-3 py-1 rounded-md border border-red-200/50 dark:border-red-900/50">
            SEC_ERROR_PRIVILEGE_NOT_MET
          </span>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.actor.toLowerCase().includes(logSearch.toLowerCase());
    const matchesModule = logModuleFilter === "" || log.module === logModuleFilter;
    const matchesStatus = logStatusFilter === "" || log.status === logStatusFilter;
    return matchesSearch && matchesModule && matchesStatus;
  });

  return (
    <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#1b4d3e] flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Security & Access Logs
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time audit log of access attempts, privilege elevations, and compliance checks inside Prabandh.</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/20 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Compliance Auditing Active
          </span>
        </div>
      </div>

      {/* Access Logs Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search Actor..." 
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20"
          />
        </div>
        <select 
          value={logModuleFilter}
          onChange={(e) => setLogModuleFilter(e.target.value)}
          className="p-2 border rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20"
        >
          <option value="">All Modules</option>
          <option value="Clients">Clients & KYC</option>
          <option value="Tasks">Tasks & SOPs</option>
          <option value="Vault">DSC & Vault Passwords</option>
          <option value="System">System Config</option>
          <option value="Billing">Billing & Invoice</option>
        </select>
        <select 
          value={logStatusFilter}
          onChange={(e) => setLogStatusFilter(e.target.value)}
          className="p-2 border rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#1b4d3e]/20"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success (Authorized)</option>
          <option value="FAILED">Failed (Blocked)</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs bg-muted/60 uppercase text-muted-foreground font-bold border-b">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredLogs.map((log, index) => (
                <tr key={index} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{log.time}</td>
                  <td className="px-4 py-3 font-semibold text-primary">
                    <div className="flex flex-col">
                      <span>{log.actor}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{log.role}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#1b4d3e]">{log.module}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{log.ip}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border",
                      log.status === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                    )}>
                      {log.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground italic">No matching access logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
