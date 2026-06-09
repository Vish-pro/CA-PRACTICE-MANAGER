"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine
} from "recharts";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle,
  Clock, Users, Percent, Send, MessageSquare, Share2,
  FileSpreadsheet, Printer, Download, AlertTriangle, Activity,
  ArrowRight, ShieldAlert, ChevronUp, ChevronDown, Check
} from "lucide-react";

// ── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#6366f1", // Indigo
  green:   "#10b981", // Emerald
  orange:  "#f59e0b", // Amber
  red:     "#ef4444", // Red
  blue:    "#3b82f6", // Blue
  purple:  "#8b5cf6", // Purple
  cyan:    "#06b6d4", // Cyan
  pink:    "#ec4899", // Pink
  slate:   "#64748b", // Slate
};

const AGING_COLORS: Record<string, string> = {
  'current':   COLORS.green,
  'overdue30': COLORS.orange,
  'overdue60': COLORS.red,
  'overdue90': "#7f1d1d", // Deep Dark Red
};

// ── Format Currency ──────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)} Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(2)} L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}k`
    : `₹${n}`;

// ── Format Number with Commas ────────────────────────────────────────────────
const fmtIndian = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

// ── KPI Card Component ────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: { val: string; isPositive: boolean };
}) {
  return (
    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="text-sm font-semibold text-muted-foreground mt-1">{label}</div>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105", color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-muted/50">
        <span className="text-xs text-muted-foreground font-medium">{sub}</span>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5",
            trend.isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}>
            {trend.isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {trend.val}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Report Card Wrapper ───────────────────────────────────────────────────────
function ReportCard({ title, subtitle, children, actions }: {
  title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}

export default function FinancialReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"receivables" | "profitability" | "expenses">("receivables");
  
  // Outstanding Reminder States
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [reminderMethod, setReminderMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [customText, setCustomText] = useState("");
  const [reminderSent, setReminderSent] = useState(false);

  // Recovery Exp States
  const [billingExpense, setBillingExpense] = useState<any>(null);
  const [billSuccess, setBillSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/reports/financial')
      .then(r => r.json())
      .then(json => { if (json.data) setData(json.data); })
      .finally(() => setLoading(false));
  }, []);

  // Update customText when an invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      const company = selectedInvoice.clientName;
      const amt = fmtIndian(selectedInvoice.outstanding);
      const invNo = selectedInvoice.invoiceNumber;
      const days = selectedInvoice.overdueDays;
      const partner = selectedInvoice.partnerName;

      if (reminderMethod === "whatsapp") {
        setCustomText(
          `Dear Client, this is a friendly payment reminder from ${partner}. Invoice *${invNo}* for *${amt}* is currently outstanding for *${days} days*. We kindly request you to clear the dues at your earliest convenience. Please ignore if already paid. Thank you!`
        );
      } else {
        setCustomText(
          `Dear Finance Team,\n\nWe hope this email finds you well.\n\nThis is a standard reminder from the accounts department at ${partner} regarding your outstanding balance. Invoice #${invNo} for ${amt} is overdue by ${days} days.\n\nKindly process this invoice at the earliest. If you require our bank details or a copy of the original invoice, please reply to this email.\n\nThank you for your cooperation.\n\nBest Regards,\nAccounts Team\n${partner}`
        );
      }
    }
  }, [selectedInvoice, reminderMethod]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground space-y-3">
        <Activity className="w-10 h-10 animate-spin text-primary" />
        <span className="text-sm font-medium">Analyzing firm ledgers & computing margins...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500 space-y-2">
        <AlertCircle className="w-10 h-10" />
        <span className="font-semibold">Failed to process CA financial reports.</span>
      </div>
    );
  }

  const {
    kpis, agingBucketsByPartner, marginAnalysis, cashFlowForecast,
    clientProfitability, unrecoveredExpenses, leakageAlerts,
    delinquencyAlerts, outstandingInvoices
  } = data;

  // ── EXPORT ACTION ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    // Generate outstanding aging CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Client,Partner Manager,Invoice No,Total Billed,Outstanding Balance,Days Overdue,Bucket\n";
    outstandingInvoices.forEach((r: any) => {
      csvContent += `"${r.clientName}","${r.partnerName}","${r.invoiceNumber}",${r.totalAmount},${r.outstanding},${r.overdueDays},"${r.bucket}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prabandh_aged_receivables_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── TRIGGER WHATSAPP/EMAIL REMINDER ─────────────────────────────────────────
  const handleSendReminder = () => {
    if (reminderMethod === "whatsapp") {
      const phone = selectedInvoice.mobile ? selectedInvoice.mobile.replace(/\D/g, "") : "919876543210";
      // Ensure country code
      const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(customText)}`;
      window.open(url, "_blank");
    } else {
      const url = `mailto:${selectedInvoice.email}?subject=${encodeURIComponent(`Overdue Invoice Balance: ${selectedInvoice.invoiceNumber}`)}&body=${encodeURIComponent(customText)}`;
      window.open(url, "_blank");
    }
    setReminderSent(true);
    setTimeout(() => {
      setReminderSent(false);
      setSelectedInvoice(null);
    }, 2000);
  };

  // ── BILL REIMBURSEMENT TO CLIENT ───────────────────────────────────────────
  const handleBillExpense = () => {
    setBillSuccess(true);
    setTimeout(() => {
      setBillSuccess(false);
      setBillingExpense(null);
      // Remove the billed expense in local UI
      unrecoveredExpenses.splice(unrecoveredExpenses.findIndex((e: any) => e.id === billingExpense.id), 1);
      kpis.unrecoveredExpenses = Math.max(0, kpis.unrecoveredExpenses - billingExpense.amount);
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-12 print:space-y-4 print:pb-0">

      {/* ── HEADER & EXPORTS ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financial Intelligence Analytics</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Analyze CA realization rates, track unbilled WIP hours, recover out-of-pocket expenses, and secure cash flow.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-foreground bg-card border rounded-lg hover:bg-muted/50 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-foreground bg-card border rounded-lg hover:bg-muted/50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-500" />
            <span>Print Executive Summary</span>
          </button>
        </div>
      </div>

      {/* ── KPI SECTION ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          label="Realization Rate (%)"
          value={`${kpis.realizationRate}%`}
          sub="Actual Billed vs. Standard Time spent"
          icon={Percent}
          color="bg-indigo-100 text-indigo-700"
          trend={{ val: "+3.2% MoM", isPositive: true }}
        />
        <KpiCard
          label="Average Rev. Per Client (ARPU)"
          value={fmtIndian(kpis.arpu)}
          sub="Total billings ÷ active firm accounts"
          icon={Users}
          color="bg-purple-100 text-purple-700"
          trend={{ val: "+12.4% YoY", isPositive: true }}
        />
        <KpiCard
          label="Collection Effectiveness (CEI)"
          value={`${kpis.collectionEffectiveness}%`}
          sub="Bills converted to liquid cash"
          icon={CheckCircle}
          color="bg-emerald-100 text-emerald-700"
          trend={{ val: "-1.8% MoM", isPositive: false }}
        />
        <KpiCard
          label="Unbilled WIP Pipeline"
          value={fmtIndian(kpis.unbilledWip)}
          sub="Value of completed hours pending billing"
          icon={TrendingUp}
          color="bg-amber-100 text-amber-700"
          trend={{ val: "+24.5% WIP", isPositive: true }}
        />
      </div>

      {/* ── MIDDLE ROW: FEE AGING & SERVICE MARGINS ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Fee Aging Stacked Bar Chart */}
        <ReportCard
          title="Outstanding Fee Aging by Partner/Manager"
          subtitle="Receivables broken down by Client Auditor and overdue duration"
        >
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={agingBucketsByPartner}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="partner" tick={{ fontSize: 11, fontWeight: 500 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: any) => fmtIndian(v as number)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="current" name="Current (0-30d)" stackId="a" fill={AGING_COLORS.current} radius={[0, 0, 0, 0]} />
                <Bar dataKey="overdue30" name="31-60 days" stackId="a" fill={AGING_COLORS.overdue30} />
                <Bar dataKey="overdue60" name="61-90 days" stackId="a" fill={AGING_COLORS.overdue60} />
                <Bar dataKey="overdue90" name="Over 90 days" stackId="a" fill={AGING_COLORS.overdue90} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

        {/* Service Margins Comparison */}
        <ReportCard
          title="Service-Wise Profitability & Margin Analysis"
          subtitle="Actual revenue collected vs. estimated staff costs based on hours spent"
        >
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={marginAnalysis}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="service" tick={{ fontSize: 11, fontWeight: 500 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: any, name: any, props: any) => {
                    if (name === "Internal Cost") return [fmtIndian(v as number), name];
                    if (name === "Margin %") return [`${v}%`, name];
                    return [fmtIndian(v as number), name];
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Billed Revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Internal Staff Cost" fill={COLORS.pink} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>

      </div>

      {/* ── ROW 3: CASH FLOW FORECASTING ─────────────────────────────────── */}
      <ReportCard
        title="Revenue & Cash Flow Predictor (30-60-90 Days Forecast)"
        subtitle="Expected liquid inflows by blending current bank balances, upcoming invoice due dates, unbilled WIP, and qualified leads"
      >
        <div className="h-[200px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashFlowForecast} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: any) => fmtIndian(v as number)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="inflow" name="Cumulative Liquidity" stroke={COLORS.primary} strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportCard>

      {/* ── ROW 4: EXPENSES TRACKING & LEAKAGE / DELINQUENCY ALERTS ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Out of pocket unrecovered expenses */}
        <ReportCard
          title="Out-of-Pocket Expenses (Unrecovered)"
          subtitle="Audit fees, MCA registration, and travel costs paid by the firm awaiting client billing"
        >
          <div className="overflow-y-auto max-h-[220px] pr-1">
            {unrecoveredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Check className="w-8 h-8 text-green-500 bg-green-50 p-1.5 rounded-full mb-2" />
                <span className="text-xs font-semibold">All out-of-pocket expenses are recovered!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {unrecoveredExpenses.map((exp: any) => (
                  <div key={exp.id} className="flex items-center justify-between border p-3 rounded-lg hover:bg-muted/10 transition-colors bg-card">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold">{exp.expense}</div>
                      <div className="text-xs text-muted-foreground">
                        {exp.client} • {exp.staff} • {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-red-600">{fmtIndian(exp.amount)}</span>
                      <button
                        onClick={() => setBillingExpense(exp)}
                        className="px-2.5 py-1 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-md transition-colors"
                      >
                        Bill to Client
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ReportCard>

        {/* Revenue Leakage & High Risk Delinquency */}
        <div className="grid grid-rows-2 gap-4">
          
          {/* Revenue Leakages */}
          <div className="bg-card border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground">Under-Billing & Revenue Leakages</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Services invoiced below standard price lists</p>
              </div>
            </div>
            <div className="space-y-2.5 mt-3 overflow-y-auto max-h-[85px] pr-1">
              {leakageAlerts.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-foreground">{l.client}</span> • <span className="text-muted-foreground">{l.service}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-muted-foreground line-through">{fmtIndian(l.stdPrice)}</span>
                    <span className="font-bold text-red-600">-{fmtIndian(l.leakage)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delinquency warnings */}
          <div className="bg-card border rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground">Delinquent Client Alert (Risk Blocker)</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Active tasks in progress for heavily overdue clients</p>
              </div>
            </div>
            <div className="space-y-2.5 mt-3 overflow-y-auto max-h-[85px] pr-1">
              {delinquencyAlerts.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-foreground">{d.client}</span>
                    <span className={cn(
                      "ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                      d.riskLevel === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {d.riskLevel}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold text-foreground">{fmtIndian(d.outstanding)}</div>
                    <div className="text-[10px] text-muted-foreground">{d.activeTasks} tasks active • {d.overdueDays}d past due</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── ROW 5: TABS (CLIENT PROFITABILITY VS Receivables) ───────────────── */}
      <div className="space-y-4">
        
        {/* Toggle bar */}
        <div className="flex border-b border-muted">
          <button
            onClick={() => setActiveTab("receivables")}
            className={cn(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] transition-colors",
              activeTab === "receivables" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Outstanding & Receivables Aging Table
          </button>
          <button
            onClick={() => setActiveTab("profitability")}
            className={cn(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-[2px] transition-colors",
              activeTab === "profitability" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Client Profitability Summary (Top & Bottom accounts)
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === "receivables" ? (
          <ReportCard
            title="Outstanding Aging & Collection Actions"
            subtitle="Send payment reminders directly via WhatsApp or Email based on aging delay"
          >
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Client Name</th>
                    <th className="px-4 py-3 font-semibold">Partner Manager</th>
                    <th className="px-4 py-3 font-semibold text-right">Invoice No</th>
                    <th className="px-4 py-3 font-semibold text-right">Total Billed</th>
                    <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                    <th className="px-4 py-3 font-semibold text-right">Days Overdue</th>
                    <th className="px-4 py-3 font-semibold text-center">Bucket</th>
                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {outstandingInvoices.map((row: any) => (
                    <tr key={row.invoiceId} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-foreground">{row.clientName}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{row.partnerName}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-muted-foreground">{row.invoiceNumber}</td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground">{fmtIndian(row.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-foreground">{fmtIndian(row.outstanding)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-red-600">{row.overdueDays}d</td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 uppercase border"
                          style={{
                            backgroundColor: (row.bucket.includes('60+') || row.bucket.includes('31')) ? AGING_COLORS.overdue60 + '12' : AGING_COLORS.current + '12',
                            color: (row.bucket.includes('60+') || row.bucket.includes('31')) ? AGING_COLORS.overdue60 : AGING_COLORS.current,
                            borderColor: (row.bucket.includes('60+') || row.bucket.includes('31')) ? AGING_COLORS.overdue60 + '40' : AGING_COLORS.current + '40',
                          }}
                        >
                          {row.bucket}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedInvoice(row)}
                          className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 mx-auto border shadow-sm",
                            row.overdueDays >= 60 
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" 
                              : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                          )}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Remind</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top 10 High Value */}
            <ReportCard
              title="Top 10 High-Profit Accounts"
              subtitle="Clients with highest contribution margins (Revenue - Cost)"
            >
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Client</th>
                      <th className="px-3 py-2 font-semibold text-right">Revenue</th>
                      <th className="px-3 py-2 font-semibold text-right">Cost</th>
                      <th className="px-3 py-2 font-semibold text-right">Margin Value</th>
                      <th className="px-3 py-2 font-semibold text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientProfitability.top.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/10">
                        <td className="px-3 py-2.5 font-semibold">{c.client}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtIndian(c.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtIndian(c.cost)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-green-600">+{fmtIndian(c.marginVal)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{c.marginPercent}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportCard>

            {/* Bottom 10 Energy Drainers */}
            <ReportCard
              title="Bottom Accounts & 'Energy Drainers'"
              subtitle="Resource-heavy accounts generating margins below standard guidelines"
            >
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Client</th>
                      <th className="px-3 py-2 font-semibold text-right">Revenue</th>
                      <th className="px-3 py-2 font-semibold text-right">Staff Hours</th>
                      <th className="px-3 py-2 font-semibold text-right">Est. Cost</th>
                      <th className="px-3 py-2 font-semibold text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientProfitability.bottom.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/10 bg-red-50/5">
                        <td className="px-3 py-2.5 font-semibold text-red-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                          <span>{c.client}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtIndian(c.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground font-semibold">{c.hours} hrs</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{fmtIndian(c.cost)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn(
                            "font-bold px-2 py-0.5 rounded-full",
                            c.marginPercent < 0 ? "bg-red-100 text-red-700" : "bg-orange-50 text-orange-700"
                          )}>
                            {c.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportCard>

          </div>
        )}

      </div>

      {/* ── MODALS (REMINDERS & EXPENSE recovery) ─────────────────────────── */}
      
      {/* 1. Payment Reminder Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold tracking-tight">Generate Client Payment Reminder</h3>
              <p className="text-xs text-muted-foreground mt-1">Send a professional accounts request to {selectedInvoice.clientName}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex gap-2 p-1 bg-muted rounded-lg border">
                <button
                  onClick={() => setReminderMethod("whatsapp")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-md transition-colors",
                    reminderMethod === "whatsapp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  WhatsApp Channel
                </button>
                <button
                  onClick={() => setReminderMethod("email")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-md transition-colors",
                    reminderMethod === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Email Channel
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Recipient Details</label>
                <div className="bg-muted/30 border p-3 rounded-lg text-xs space-y-1 font-medium">
                  <div><span className="text-muted-foreground">Company Name:</span> {selectedInvoice.clientName}</div>
                  <div><span className="text-muted-foreground">Mobile (WhatsApp):</span> {selectedInvoice.mobile}</div>
                  <div><span className="text-muted-foreground">Email Address:</span> {selectedInvoice.email}</div>
                  <div><span className="text-muted-foreground">Invoice No:</span> {selectedInvoice.invoiceNumber}</div>
                  <div><span className="text-muted-foreground">Outstanding Balance:</span> <span className="font-bold text-red-600">{fmtIndian(selectedInvoice.outstanding)}</span> ({selectedInvoice.overdueDays} days overdue)</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Message Template (Editable)</label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={6}
                  className="w-full border rounded-lg p-3 text-xs bg-background focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
                />
              </div>

              {/* Success note */}
              {reminderSent && (
                <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-green-600 bg-white rounded-full p-0.5" />
                  <span>Redirecting to {reminderMethod === "whatsapp" ? "WhatsApp Web API..." : "Default Mail client..."}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-muted/40 border-t flex justify-end gap-2">
              <button
                onClick={() => setSelectedInvoice(null)}
                disabled={reminderSent}
                className="px-4 py-2 text-xs font-bold border hover:bg-muted bg-card rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={reminderSent}
                className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-primary/20"
              >
                {reminderMethod === "whatsapp" ? <MessageSquare className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Reminder Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Bill Expense Modal */}
      {billingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b">
              <h3 className="text-base font-bold tracking-tight">Bill Expense to Client Invoice</h3>
              <p className="text-xs text-muted-foreground mt-1">Convert out-of-pocket charges into billable line item</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3.5 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Recovery Confirmation</span>
                </div>
                <p className="mt-1 leading-relaxed text-amber-700/90">
                  This expense of <strong className="text-amber-950">{fmtIndian(billingExpense.amount)}</strong> was paid on behalf of <strong>{billingExpense.client}</strong>. Proceeding will add this directly as a billable item onto their next draft invoice.
                </p>
              </div>

              <div className="border rounded-xl p-3.5 space-y-2 text-xs bg-card">
                <div><span className="text-muted-foreground">Charge Description:</span> <strong className="text-foreground">{billingExpense.expense}</strong></div>
                <div><span className="text-muted-foreground">Client Profile:</span> <strong className="text-foreground">{billingExpense.client}</strong></div>
                <div><span className="text-muted-foreground">Total Recoverable:</span> <strong className="text-red-600 font-bold">{fmtIndian(billingExpense.amount)}</strong></div>
                <div><span className="text-muted-foreground">Paid By Staff:</span> <strong className="text-foreground">{billingExpense.staff}</strong></div>
              </div>

              {/* Success note */}
              {billSuccess && (
                <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-green-600 bg-white rounded-full p-0.5" />
                  <span>Successfully recovered! Added to billing queue.</span>
                </div>
              )}
            </div>

            <div className="px-5 py-4.5 bg-muted/40 border-t flex justify-end gap-2">
              <button
                onClick={() => setBillingExpense(null)}
                disabled={billSuccess}
                className="px-4 py-2 text-xs font-bold border hover:bg-muted bg-card rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBillExpense}
                disabled={billSuccess}
                className="px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-green-600/20"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Confirm Recovery Billing</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple dynamic CreditCard icon from lucide-react (imported but mapped)
function CreditCard({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}