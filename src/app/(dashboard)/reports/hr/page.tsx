"use client";

import { useState, useEffect } from "react";
import { 
  Award, TrendingUp, Users, Calendar, AlertCircle, CheckCircle, 
  Clock, ShieldAlert, BarChart3, PieChart, Star, Activity, UserCheck
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area 
} from "recharts";
import { cn } from "@/lib/utils";

// --- Mock Stats & Data for HR Reports ---
const hiringFunnelData = [
  { stage: "Applied", Count: 48, Ratio: "100%" },
  { stage: "Screened", Count: 36, Ratio: "75%" },
  { stage: "Interview", Count: 20, Ratio: "41.6%" },
  { stage: "Offered", Count: 8, Ratio: "16.6%" },
  { stage: "Hired", Count: 4, Ratio: "8.3%" }
];

const leaveDeptData = [
  { department: "Audit", SICK: 8, CASUAL: 12, EARNED: 15 },
  { department: "GST", SICK: 14, CASUAL: 8, EARNED: 6 },
  { department: "Direct Tax", SICK: 5, CASUAL: 15, EARNED: 18 },
  { department: "Corporate Law", SICK: 3, CASUAL: 6, EARNED: 4 },
  { department: "Admin/HR", SICK: 2, CASUAL: 10, EARNED: 5 }
];

const timesheetWipContribution = [
  { name: "Rajesh Iyer (HOD)", Hours: 192, BillableWip: 145000, Tier: "Qualified CA" },
  { name: "Neha Gupta (HOD)", Hours: 180, BillableWip: 120000, Tier: "Qualified CA" },
  { name: "Aditya Verma", Hours: 172, BillableWip: 85000, Tier: "Paid Assistant" },
  { name: "Kunal Sen", Hours: 160, BillableWip: 35000, Tier: "Article" },
  { name: "Meera Nair", Hours: 152, BillableWip: 32000, Tier: "Article" },
  { name: "Aniket Joshi", Hours: 148, BillableWip: 30000, Tier: "Article" }
];

interface ArticleProgress {
  name: string;
  regNo: string;
  doj: string;
  servedDays: number;
  remDays: number;
  leavesTaken: number;
  allowedLeaves: number;
  status: "HEALTHY" | "RISK_WARNING" | "EXCEEDED";
}

const articleProgressData: ArticleProgress[] = [
  { name: "Kunal Sen", regNo: "ICAI/ART/109823", doj: "2025-05-26", servedDays: 365, remDays: 365, leavesTaken: 12, allowedLeaves: 24, status: "HEALTHY" },
  { name: "Meera Nair", regNo: "ICAI/ART/110294", doj: "2025-08-10", servedDays: 290, remDays: 440, leavesTaken: 8, allowedLeaves: 24, status: "HEALTHY" },
  { name: "Aniket Joshi", regNo: "ICAI/ART/111093", doj: "2025-10-15", servedDays: 224, remDays: 506, leavesTaken: 14, allowedLeaves: 24, status: "RISK_WARNING" }
];

export default function HRReportsPage() {
  const [role, setRole] = useState("CLERK");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("prabandh_simulated_role");
    if (stored) {
      setRole(stored);
    }
    setLoading(false);
  }, []);

  const isHrOrPartner = role === "HR" || role === "ADMIN" || role === "PARTNER" || role === "DIRECTOR";

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground uppercase font-bold">Loading report matrix...</div>;
  }

  // Double guard check - if not HR or Partner, deny visual render
  if (!isHrOrPartner) {
    return (
      <div className="bg-card border rounded-xl p-12 text-center max-w-2xl mx-auto shadow-sm flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">Master Reports Lockout</h2>
        <p className="text-sm text-muted-foreground">
          Access Denied: The HR & Staffing Intelligence reports are restricted strictly under firm privacy compliance matrices. Visible only to HR Managers, Partners, and Managing Directors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Time-to-Hire</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1">12.5 Days</h3>
            <span className="text-[9px] text-green-600 font-bold bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded leading-none mt-1.5 inline-block uppercase">
              ▲ 2.4 Days Faster
            </span>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Leave Absenteeism</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1">4.2%</h3>
            <span className="text-[9px] text-[#1b4d3e] dark:text-emerald-400 font-bold bg-[#1b4d3e]/5 px-1.5 py-0.5 rounded leading-none mt-1.5 inline-block uppercase">
              ■ Within Target Range
            </span>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ICAI Compliance Score</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1">98.2%</h3>
            <span className="text-[9px] text-green-600 font-bold bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded leading-none mt-1.5 inline-block uppercase">
              ✓ Fully Audit Compliant
            </span>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Staff Billing Margin</span>
            <h3 className="text-2xl font-bold tracking-tight mt-1">78.5%</h3>
            <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded leading-none mt-1.5 inline-block uppercase">
              ▲ 1.8% This Quarter
            </span>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recruitment Funnel Conversion */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">📋 Hiring Funnel Conversion Rates</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tracking applicant conversion velocity across screening and offer stages.</p>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hiringFunnelData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" stroke="#888888" fontSize={10} />
                <YAxis dataKey="stage" type="category" stroke="#888888" fontSize={10} />
                <Tooltip 
                  contentStyle={{ background: "#1f2937", border: "none", borderRadius: "8px", fontSize: "11px", color: "#fff" }} 
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="Count" fill="#1b4d3e" radius={[0, 4, 4, 0]} name="Candidates Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Utilization Breakdown by Department */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">📅 Leaves utilization by Department</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Analysis of sick, casual, and earned leave distribution by specialty squad.</p>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveDeptData} margin={{ top: 10, right: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="department" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} />
                <Tooltip 
                  contentStyle={{ background: "#1f2937", border: "none", borderRadius: "8px", fontSize: "11px", color: "#fff" }} 
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="SICK" fill="#ef4444" stackId="a" name="Sick Leaves" />
                <Bar dataKey="CASUAL" fill="#f59e0b" stackId="a" name="Casual Leaves" />
                <Bar dataKey="EARNED" fill="#3b82f6" stackId="a" name="Earned Leaves" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Articleship Compliance & WIP Billable Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Articleship Progress compliance (2/3 width) */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">🎓 Articleship Regulatory compliance Progress</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Tracking serving term progression and statutory leave balances under ICAI laws.</p>
            </div>
            <Award className="w-5 h-5 text-[#1b4d3e]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 uppercase text-muted-foreground font-bold border-b">
                <tr>
                  <th className="px-3 py-3">Article Assistant</th>
                  <th className="px-3 py-3">Term Served</th>
                  <th className="px-3 py-3">Leaves Logged</th>
                  <th className="px-3 py-3">Leaves Remaining</th>
                  <th className="px-3 py-3 text-center">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {articleProgressData.map((article, i) => {
                  const progressPct = ((article.servedDays / 730) * 100).toFixed(1);
                  return (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-4">
                        <div className="font-bold text-[#1b4d3e] dark:text-emerald-400">{article.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{article.regNo}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{progressPct}%</span>
                          <div className="w-24 h-2.5 bg-muted border rounded-full overflow-hidden p-0.5">
                            <div 
                              className="h-full bg-gradient-to-r from-[#1b4d3e] to-emerald-500 rounded-full" 
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{article.servedDays} / 730 Served</div>
                      </td>
                      <td className="px-3 py-4 font-mono font-bold text-foreground">{article.leavesTaken} days</td>
                      <td className="px-3 py-4 font-mono font-semibold text-muted-foreground">
                        {article.allowedLeaves - article.leavesTaken} days remaining
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] border inline-flex items-center gap-1",
                          article.status === "HEALTHY" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-950",
                          article.status === "RISK_WARNING" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950",
                          article.status === "EXCEEDED" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", 
                            article.status === "HEALTHY" && "bg-green-500 animate-pulse",
                            article.status === "RISK_WARNING" && "bg-amber-500 animate-pulse",
                            article.status === "EXCEEDED" && "bg-red-500 animate-pulse"
                          )}></span>
                          {article.status === "HEALTHY" ? "Healthy (Within Range)" : "Risk (High Absences)"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: WIP Billable Hours contribution (1/3 width) */}
        <div className="lg:col-span-1 bg-card border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">⚡ WIP Revenue contribution</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Billable hours converted to realization values.</p>
            </div>
            <Activity className="w-5 h-5 text-[#1b4d3e]" />
          </div>

          <div className="space-y-3.5">
            {timesheetWipContribution.map((staff, i) => (
              <div key={i} className="flex flex-col space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground">{staff.name}</span>
                  <span className="font-mono font-bold text-[#1b4d3e] dark:text-emerald-400">
                    ₹{staff.BillableWip.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold">
                  <span>{staff.Tier}</span>
                  <span>{staff.Hours} hrs logged</span>
                </div>
                {/* Horizontal contribution bar */}
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1b4d3e] rounded-full" 
                    style={{ width: `${(staff.BillableWip / 145000) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
