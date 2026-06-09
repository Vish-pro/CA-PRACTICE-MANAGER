"use client";

import { useState, useEffect } from "react";
import { 
  Clock, IndianRupee, ShieldCheck, CalendarRange, 
  AlertTriangle, Award, CheckCircle, TrendingUp, BarChart3
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, AreaChart, Area 
} from "recharts";
import { cn } from "@/lib/utils";

// --- Mock Analytics Data ---
const productivityCurveData = [
  { name: "Week 1", Billable: 35, Internal: 5 },
  { name: "Week 2", Billable: 38, Internal: 4 },
  { name: "Week 3", Billable: 42, Internal: 6 },
  { name: "Week 4", Billable: 40, Internal: 5 },
  { name: "Week 5", Billable: 45, Internal: 3 }
];

const attendanceLogsData = [
  { date: "2026-05-26", checkIn: "09:30 AM", checkOut: "06:30 PM", status: "Present", hours: 9.0 },
  { date: "2026-05-25", checkIn: "09:15 AM", checkOut: "06:15 PM", status: "Present", hours: 9.0 },
  { date: "2026-05-24", checkIn: "09:45 AM", checkOut: "06:45 PM", status: "Present", hours: 9.0 },
  { date: "2026-05-23", checkIn: "09:00 AM", checkOut: "05:00 PM", status: "Present", hours: 8.0 },
  { date: "2026-05-22", checkIn: "10:00 AM", checkOut: "04:30 PM", status: "Half Day", hours: 6.5 }
];

interface ArticleProgress {
  name: string;
  regNo: string;
  servedDays: number;
  leavesTaken: number;
  allowedLeaves: number;
  status: "HEALTHY" | "RISK_WARNING" | "EXCEEDED";
}

const articleComplianceData: ArticleProgress[] = [
  { name: "Kunal Sen", regNo: "ICAI/ART/109823", servedDays: 365, leavesTaken: 12, allowedLeaves: 24, status: "HEALTHY" },
  { name: "Meera Nair", regNo: "ICAI/ART/110294", servedDays: 290, leavesTaken: 8, allowedLeaves: 24, status: "HEALTHY" },
  { name: "Aniket Joshi", regNo: "ICAI/ART/111093", servedDays: 224, leavesTaken: 14, allowedLeaves: 24, status: "RISK_WARNING" }
];

export default function EmployeeAnalyticsPage() {
  const [role, setRole] = useState("CLERK");
  const [timesheetStats, setTimesheetStats] = useState({ totalHours: 0, pendingCount: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkRole = () => {
        setRole(localStorage.getItem("prabandh_simulated_role") || "CLERK");
      };
      checkRole();
      window.addEventListener("storage", checkRole);
      window.addEventListener("role-change", checkRole as EventListener);

      // Load timesheets to calculate total hours logged
      const stored = localStorage.getItem("ca_daily_timesheets");
      if (stored) {
        const parsed = JSON.parse(stored) as any[];
        const total = parsed.reduce((sum, item) => sum + (item.hours || 0), 0);
        const pending = parsed.filter(item => item.status === "PENDING").length;
        setTimesheetStats({ totalHours: total, pendingCount: pending });
      }

      return () => {
        window.removeEventListener("storage", checkRole);
        window.removeEventListener("role-change", checkRole as EventListener);
      };
    }
  }, []);

  const totalBillableHrs = timesheetStats.totalHours || 172.5;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Metric Indicators Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Time Tracked</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1">{totalBillableHrs.toFixed(1)} Hrs</h3>
            <span className="text-[9px] text-green-600 font-bold bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded mt-1.5 inline-block uppercase tracking-wider">
              ▲ 14.8 hrs this week
            </span>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Timesheet WIP Value</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1">₹{Math.round(totalBillableHrs * 1250).toLocaleString("en-IN")}</h3>
            <span className="text-[9px] text-green-600 font-bold bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded mt-1.5 inline-block uppercase tracking-wider">
              Realized @ ₹1250/hr
            </span>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-xl">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance Ratio</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1">96.8%</h3>
            <span className="text-[9px] text-[#1b4d3e] dark:text-emerald-400 font-bold bg-[#1b4d3e]/5 px-1.5 py-0.5 rounded mt-1.5 inline-block uppercase tracking-wider">
              ✓ Fully Compliant
            </span>
          </div>
          <div className="p-3 bg-[#1b4d3e]/5 dark:bg-emerald-950/20 text-[#1b4d3e] dark:text-emerald-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-card border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending Sign-offs</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1">{timesheetStats.pendingCount} Entries</h3>
            <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded mt-1.5 inline-block uppercase tracking-wider">
              Awaiting Supervisor
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
            <CalendarRange className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Productivity curve area chart */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">📈 Productivity & Realization Curves</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Analysing billable vs internal non-billable engagement hours over last 5 weeks.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivityCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBillable" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b4d3e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1b4d3e" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorInternal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Area type="monotone" dataKey="Billable" stroke="#1b4d3e" fillOpacity={1} fill="url(#colorBillable)" name="Billable Hours" />
                <Area type="monotone" dataKey="Internal" stroke="#ef4444" fillOpacity={1} fill="url(#colorInternal)" name="Internal/Admin" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Category Share (Bar chart representation) */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">📊 Category Engagement Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution of billable timesheet hours mapped across filing domains.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { category: "GST Filings", Hours: 78 },
                { category: "Direct Tax", Hours: 42 },
                { category: "Statutory Audit", Hours: 35 },
                { category: "MCA/ROC", Hours: 12 },
                { category: "Manual Admin", Hours: 5 }
              ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="category" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                <Bar dataKey="Hours" fill="#1b4d3e" radius={[4, 4, 0, 0]} name="Hours Logged" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Lower Row: Articleship progress & Attendance Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Articleship progress compliance (2/3 width) */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Award className="w-5 h-5 text-[#1b4d3e]" />
                🎓 ICAI Articleship Compliance Tracker
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Statutory 2-year practical training audits, leave caps (24 allowed), and serving periods.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 uppercase text-muted-foreground font-bold border-b">
                <tr>
                  <th className="px-3 py-3">Article Assistant</th>
                  <th className="px-3 py-3">Registration Number</th>
                  <th className="px-3 py-3">Term Served</th>
                  <th className="px-3 py-3">Leaves Taken</th>
                  <th className="px-3 py-3 text-right">ICAI Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {articleComplianceData.map((article, i) => {
                  const progressPct = ((article.servedDays / 730) * 100).toFixed(1);
                  return (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-4 font-bold text-[#1b4d3e] dark:text-emerald-400">{article.name}</td>
                      <td className="px-3 py-4 font-mono font-medium text-muted-foreground">{article.regNo}</td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold">{progressPct}%</span>
                          <div className="w-20 h-2 bg-muted border rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#1b4d3e] to-emerald-500" style={{ width: `${progressPct}%` }}></div>
                          </div>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{article.servedDays} / 730 days served</div>
                      </td>
                      <td className="px-3 py-4 font-mono font-bold">{article.leavesTaken} / {article.allowedLeaves} Days</td>
                      <td className="px-3 py-4 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider border inline-flex items-center gap-1",
                          article.status === "HEALTHY" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-950",
                          article.status === "RISK_WARNING" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950"
                        )}>
                          <span className={cn("w-1 h-1 rounded-full", article.status === "HEALTHY" ? "bg-green-500" : "bg-amber-500")} />
                          {article.status === "HEALTHY" ? "Healthy" : "Risk (High Leaves)"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Personal Clock-in Logs */}
        <div className="lg:col-span-1 bg-card border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-[#1b4d3e]" />
                📅 My Daily Attendance Logs
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Logs of recent check-ins.</p>
            </div>
          </div>

          <div className="space-y-3">
            {attendanceLogsData.map((log, i) => (
              <div key={i} className="flex justify-between items-center text-xs p-2.5 border rounded-xl bg-muted/20 hover:border-primary/20 transition-all">
                <div>
                  <div className="font-extrabold text-foreground">{log.date}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{log.checkIn} - {log.checkOut}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-primary">{log.hours.toFixed(1)} hrs</span>
                  <div className="text-[9px] font-extrabold text-green-600 dark:text-green-400 mt-0.5 uppercase tracking-wider">{log.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
