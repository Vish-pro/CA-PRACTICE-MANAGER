"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";
import {
  TrendingUp, DollarSign, AlertCircle, CheckCircle,
  Clock, CreditCard, Users, Percent
} from "lucide-react";

// ── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#6366f1",
  green:   "#22c55e",
  orange:  "#f59e0b",
  red:     "#ef4444",
  blue:    "#3b82f6",
  purple:  "#a855f7",
  cyan:    "#06b6d4",
  yellow:  "#eab308",
};
const PIE_COLORS = [COLORS.primary, COLORS.green, COLORS.orange, COLORS.red, COLORS.blue, COLORS.purple];

const STATUS_COLORS: Record<string, string> = {
  PAID:     COLORS.green,
  PARTIAL:  COLORS.orange,
  UNPAID:   COLORS.red,
  PROFORMA: COLORS.blue,
};

const BUCKET_COLORS: Record<string, string> = {
  'Current':    COLORS.green,
  '0–30 days':  COLORS.orange,
  '31–60 days': COLORS.red,
  '60+ days':   '#7f1d1d',
};

// ── Format currency ──────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(1)}Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}k`
    : `₹${n}`;

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 flex items-start justify-between">
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</div>}
      </div>
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────
function ReportCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/billing')
      .then(r => r.json())
      .then(json => { if (json.data) setData(json.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        Loading billing report data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        Failed to load billing report data.
      </div>
    );
  }

  const {
    kpis, monthlyTrend, statusDistribution, revenueComparison,
    agedReceivables, agedBuckets, arpuByEntity, topClients, paymentMethods,
  } = data;

  return (
    <div className="space-y-6 pb-10">

      {/* ── KPI BAR ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Invoiced"    value={fmt(kpis.totalInvoiced)}    icon={DollarSign}  color="bg-blue-100 text-blue-600" />
        <KpiCard label="Total Collected"   value={fmt(kpis.totalCollected)}   icon={CheckCircle} color="bg-green-100 text-green-600" />
        <KpiCard label="Outstanding"       value={fmt(kpis.totalOutstanding)} icon={TrendingUp}  color="bg-orange-100 text-orange-600" />
        <KpiCard label="Collection Rate"   value={`${kpis.collectionRate}%`}  icon={Percent}     color="bg-indigo-100 text-indigo-600" />
        <KpiCard label="Overdue Amount"    value={fmt(kpis.overdueAmount)}    icon={AlertCircle} color="bg-red-100 text-red-600" sub="past due date" />
        <KpiCard label="Avg Days to Pay"   value={`${kpis.avgDaysToPayment}d`} icon={Clock}      color="bg-cyan-100 text-cyan-600" sub="for paid invoices" />
      </div>

      {/* ── REPORT 1: MONTHLY COLLECTION TREND ───────────────────────────── */}
      <ReportCard
        title="Monthly Collection Trend"
        subtitle="Invoices raised vs payments collected per month"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: any) => fmt(v)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="invoiced"  name="Invoiced"  fill={COLORS.blue}  radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill={COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {monthlyTrend.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-6">No invoice data yet.</p>
        )}
      </ReportCard>

      {/* ── REPORTS 2 + 7: STATUS DISTRIBUTION + PAYMENT METHODS ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Report 2 — Invoice Status Distribution */}
        <ReportCard
          title="Invoice Status Distribution"
          subtitle="Count and value breakdown by invoice status"
        >
          <div className="h-56 flex items-center">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution.filter((s: any) => s.totalAmount > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="totalAmount"
                >
                  {statusDistribution.filter((s: any) => s.totalAmount > 0).map((s: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status] || PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => fmt(v)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3 pl-2">
              {statusDistribution.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[s.status] || PIE_COLORS[i] }}
                  />
                  <span className="flex-1 text-muted-foreground capitalize">
                    {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                  </span>
                  <span className="font-semibold">{fmt(s.totalAmount)}</span>
                  <span className="text-muted-foreground text-xs">({s.count})</span>
                </div>
              ))}
              {statusDistribution.every((s: any) => s.totalAmount === 0) && (
                <p className="text-sm text-muted-foreground italic">No invoice data yet.</p>
              )}
            </div>
          </div>
        </ReportCard>

        {/* Report 7 — Payment Method Breakdown */}
        <ReportCard
          title="Payment Method Breakdown"
          subtitle="How clients are paying — by volume and count"
        >
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">No payments recorded yet.</p>
          ) : (
            <div className="h-56 flex items-center">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="totalAmount"
                  >
                    {paymentMethods.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmt(v)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 pl-2">
                {paymentMethods.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="flex-1 text-muted-foreground">
                      {m.method.replace('_', ' ')}
                    </span>
                    <span className="font-semibold">{fmt(m.totalAmount)}</span>
                    <span className="text-muted-foreground text-xs">({m.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportCard>
      </div>

      {/* ── REPORT 3: REALIZED VS PIPELINE REVENUE ───────────────────────── */}
      <ReportCard
        title="Revenue Funnel: Pipeline → Collected"
        subtitle="How deal pipeline converts into invoiced and collected revenue"
      >
        <div className="space-y-4 pt-1">
          {(() => {
            const max = Math.max(...revenueComparison.map((r: any) => r.value), 1);
            return revenueComparison.map((r: any) => (
              <div key={r.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="font-bold">{fmt(r.value)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-7 relative overflow-hidden">
                  <div
                    className="h-7 rounded-full transition-all flex items-center pl-3"
                    style={{
                      width: `${Math.max(r.value > 0 ? (r.value / max) * 100 : 0, r.value > 0 ? 4 : 0)}%`,
                      backgroundColor: r.color,
                    }}
                  />
                </div>
              </div>
            ));
          })()}
        </div>
        {revenueComparison.every((r: any) => r.value === 0) && (
          <p className="text-sm text-muted-foreground italic text-center py-6">No revenue data yet.</p>
        )}
      </ReportCard>

      {/* ── REPORTS 5 + 6: ARPU + TOP CLIENTS ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Report 5 — ARPU by Entity Type */}
        <ReportCard
          title="Average Revenue Per Client (ARPU)"
          subtitle="Total invoiced ÷ active clients — by business entity type"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={arpuByEntity}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="entity" tick={{ fontSize: 11 }} width={90} />
                <Tooltip
                  formatter={(v: any, name: any) =>
                    name === 'ARPU' ? fmt(v) : [fmt(v as number), name]
                  }
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="arpu" name="ARPU" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {arpuByEntity.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-6">No client or invoice data yet.</p>
          )}
        </ReportCard>

        {/* Report 6 — Top Clients by Revenue */}
        <ReportCard
          title="Top Clients by Revenue"
          subtitle="Ranked by total invoiced — top 10"
        >
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">No invoice data yet.</p>
          ) : (
            <div className="space-y-3 pt-1 overflow-y-auto max-h-64">
              {topClients.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                    i === 1 ? "bg-gray-100 text-gray-600" :
                    i === 2 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate">{c.clientName}</span>
                      <span className="text-muted-foreground shrink-0 ml-2 text-xs">
                        {fmt(c.totalPaid)}/{fmt(c.totalInvoiced)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${c.collectionRate}%` }}
                      />
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold shrink-0",
                    c.collectionRate === 100 ? "text-green-600" :
                    c.collectionRate >= 50 ? "text-orange-500" : "text-red-500"
                  )}>
                    {c.collectionRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </ReportCard>
      </div>

      {/* ── REPORT 4: AGED RECEIVABLES ────────────────────────────────────── */}
      <ReportCard
        title="Outstanding & Aged Receivables"
        subtitle="Unpaid and partially paid invoices — categorized by how overdue they are"
      >
        {/* Bucket summary bar */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {agedBuckets.map((b: any) => (
            <div
              key={b.bucket}
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: BUCKET_COLORS[b.bucket] + '18', border: `1px solid ${BUCKET_COLORS[b.bucket]}40` }}
            >
              <div className="text-lg font-bold" style={{ color: BUCKET_COLORS[b.bucket] }}>
                {fmt(b.amount)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{b.bucket}</div>
            </div>
          ))}
        </div>

        {/* Receivables table */}
        {agedReceivables.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            No outstanding receivables — all invoices are paid or in proforma.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 font-medium">Client</th>
                  <th className="text-right py-2 font-medium">Invoice Total</th>
                  <th className="text-right py-2 font-medium">Paid</th>
                  <th className="text-right py-2 font-medium">Outstanding</th>
                  <th className="text-right py-2 font-medium">Due Date</th>
                  <th className="text-right py-2 font-medium">Days Overdue</th>
                  <th className="text-right py-2 font-medium">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {agedReceivables.map((r: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">{r.clientName}</td>
                    <td className="py-3 text-right text-muted-foreground">{fmt(r.totalAmount)}</td>
                    <td className="py-3 text-right text-green-600">{fmt(r.paid)}</td>
                    <td className="py-3 text-right font-bold">{fmt(r.outstanding)}</td>
                    <td className="py-3 text-right text-muted-foreground text-xs">
                      {r.dueDate
                        ? new Date(r.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'
                      }
                    </td>
                    <td className="py-3 text-right">
                      {r.daysOverdue > 0 ? (
                        <span className="font-semibold" style={{ color: BUCKET_COLORS[r.bucket] }}>
                          {r.daysOverdue}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: BUCKET_COLORS[r.bucket] + '18',
                          color: BUCKET_COLORS[r.bucket],
                          border: `1px solid ${BUCKET_COLORS[r.bucket]}40`,
                        }}
                      >
                        {r.bucket}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

    </div>
  );
}
