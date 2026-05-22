# PRABANDH — Billing & Revenue Reports Specification

> Hand this to Jules. Build the Billing & Revenue reports tab exactly as described below.
> Do NOT touch any existing report pages (financial, tasks, leads-pipeline).
> Tech stack unchanged: Next.js App Router, Prisma + SQLite, Tailwind, recharts, lucide-react.
> recharts is already installed — use it for all charts.

---

## OVERVIEW

Add a fourth tab **"Billing & Revenue"** to the existing reports layout.

| Tab | Route | Status |
|-----|-------|--------|
| Leads & Pipeline | `/reports/leads-pipeline` | Exists — keep as-is |
| Financial | `/reports/financial` | Exists — keep as-is |
| Tasks | `/reports/tasks` | Exists — keep as-is |
| Billing & Revenue | `/reports/billing` | **Build this** |

---

## FILE STRUCTURE

```
src/
  app/
    (dashboard)/
      reports/
        layout.tsx              ← MODIFY: add Billing & Revenue tab
        billing/
          page.tsx              ← NEW: all 7 billing reports
    api/
      reports/
        billing/
          route.ts              ← NEW: single endpoint returns all 7 datasets
```

---

## STEP 1 — Update Reports Layout

**File to modify:** `src/app/(dashboard)/reports/layout.tsx`

Add the Billing & Revenue tab to the `tabs` array:

```tsx
const tabs = [
  { label: "Leads & Pipeline", href: "/reports/leads-pipeline" },
  { label: "Financial",        href: "/reports/financial" },
  { label: "Tasks",            href: "/reports/tasks" },
  { label: "Billing & Revenue", href: "/reports/billing" },   // ← ADD THIS LINE
];
```

Do not change anything else in this file.

---

## STEP 2 — Create the Billing API Endpoint

**File to create:** `src/app/api/reports/billing/route.ts`

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all invoices with client, payments, line items
    const invoices = await prisma.invoice.findMany({
      include: {
        client: {
          select: { id: true, companyName: true, businessEntity: true, isActive: true },
        },
        payments: true,
        lineItems: true,
      },
    });

    // Fetch converted + active-pipeline leads for realized vs pipeline
    const leads = await prisma.lead.findMany({
      select: { dealValue: true, stage: true },
    });

    // Fetch active client count per entity type for ARPU
    const activeClients = await prisma.clientProfile.findMany({
      where: { isActive: true },
      select: { id: true, businessEntity: true },
    });

    const now = new Date();

    // ── KPIs ────────────────────────────────────────────────────────────────
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = invoices.reduce(
      (sum, inv) => sum + inv.payments.reduce((s, p) => s + p.amount, 0),
      0
    );
    const totalOutstanding = totalInvoiced - totalCollected;
    const collectionRate = totalInvoiced > 0
      ? Math.round((totalCollected / totalInvoiced) * 100)
      : 0;

    // Overdue amount: UNPAID or PARTIAL invoices whose dueDate is in the past
    const overdueAmount = invoices
      .filter(inv =>
        ['UNPAID', 'PARTIAL'].includes(inv.status) &&
        inv.dueDate &&
        new Date(inv.dueDate) < now
      )
      .reduce((sum, inv) => {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        return sum + (inv.totalAmount - paid);
      }, 0);

    // Avg days to payment: for PAID invoices, days from issueDate to last payment
    const paidInvoices = invoices.filter(inv => inv.status === 'PAID' && inv.payments.length > 0);
    const paymentDays = paidInvoices.map(inv => {
      const lastPayment = inv.payments.sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )[0];
      const ms = new Date(lastPayment.paymentDate).getTime() - new Date(inv.issueDate).getTime();
      return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
    });
    const avgDaysToPayment = paymentDays.length > 0
      ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length)
      : 0;

    // ── REPORT 1: MONTHLY COLLECTION TREND ──────────────────────────────────
    const monthlyMap: Record<string, { month: string; invoiced: number; collected: number }> = {};

    invoices.forEach(inv => {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!monthlyMap[key]) monthlyMap[key] = { month: label, invoiced: 0, collected: 0 };
      monthlyMap[key].invoiced += inv.totalAmount;
    });

    // payments bucketed by paymentDate month
    invoices.forEach(inv => {
      inv.payments.forEach(p => {
        const d = new Date(p.paymentDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        if (!monthlyMap[key]) monthlyMap[key] = { month: label, invoiced: 0, collected: 0 };
        monthlyMap[key].collected += p.amount;
      });
    });

    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // ── REPORT 2: INVOICE STATUS DISTRIBUTION ───────────────────────────────
    const statusGroups: Record<string, { status: string; count: number; totalAmount: number }> = {};
    ['PROFORMA', 'UNPAID', 'PARTIAL', 'PAID'].forEach(s => {
      statusGroups[s] = { status: s, count: 0, totalAmount: 0 };
    });
    invoices.forEach(inv => {
      const s = inv.status || 'PROFORMA';
      if (statusGroups[s]) {
        statusGroups[s].count++;
        statusGroups[s].totalAmount += inv.totalAmount;
      }
    });
    const statusDistribution = Object.values(statusGroups);

    // ── REPORT 3: REALIZED VS PIPELINE REVENUE ──────────────────────────────
    const pipelineValue = leads
      .filter(l => !['CONVERTED', 'LOST'].includes(l.stage))
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const wonValue = leads
      .filter(l => l.stage === 'CONVERTED')
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);

    const revenueComparison = [
      { label: 'Pipeline (Active Leads)', value: pipelineValue, color: '#3b82f6' },
      { label: 'Won Deals',               value: wonValue,       color: '#6366f1' },
      { label: 'Invoiced',                value: totalInvoiced,  color: '#f59e0b' },
      { label: 'Collected',               value: totalCollected, color: '#22c55e' },
    ];

    // ── REPORT 4: AGED RECEIVABLES ───────────────────────────────────────────
    const agedReceivables: {
      invoiceId: string;
      clientName: string;
      totalAmount: number;
      paid: number;
      outstanding: number;
      dueDate: string | null;
      daysOverdue: number;
      bucket: string;
    }[] = [];

    invoices
      .filter(inv => ['UNPAID', 'PARTIAL'].includes(inv.status))
      .forEach(inv => {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        const outstanding = inv.totalAmount - paid;
        if (outstanding <= 0) return;

        let daysOverdue = 0;
        let bucket = 'Current';

        if (inv.dueDate) {
          const due = new Date(inv.dueDate);
          if (due < now) {
            daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
            if (daysOverdue <= 30)       bucket = '0–30 days';
            else if (daysOverdue <= 60)  bucket = '31–60 days';
            else                          bucket = '60+ days';
          }
        }

        agedReceivables.push({
          invoiceId: inv.id,
          clientName: inv.client.companyName,
          totalAmount: inv.totalAmount,
          paid,
          outstanding,
          dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
          daysOverdue,
          bucket,
        });
      });

    // Sort by daysOverdue desc (worst first)
    agedReceivables.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Bucket summary for the bar chart above the table
    const agedBuckets = [
      { bucket: 'Current',    amount: 0 },
      { bucket: '0–30 days', amount: 0 },
      { bucket: '31–60 days',amount: 0 },
      { bucket: '60+ days',  amount: 0 },
    ];
    agedReceivables.forEach(r => {
      const b = agedBuckets.find(b => b.bucket === r.bucket);
      if (b) b.amount += r.outstanding;
    });

    // ── REPORT 5: ARPU BY ENTITY TYPE ───────────────────────────────────────
    const entityMap: Record<string, { entity: string; totalInvoiced: number; activeClientCount: number }> = {};

    // Seed from active clients
    activeClients.forEach(c => {
      const entity = c.businessEntity || 'Unknown';
      if (!entityMap[entity]) entityMap[entity] = { entity, totalInvoiced: 0, activeClientCount: 0 };
      entityMap[entity].activeClientCount++;
    });

    // Sum invoiced per entity
    invoices.forEach(inv => {
      const entity = inv.client.businessEntity || 'Unknown';
      if (!entityMap[entity]) entityMap[entity] = { entity, totalInvoiced: 0, activeClientCount: 0 };
      entityMap[entity].totalInvoiced += inv.totalAmount;
    });

    const arpuByEntity = Object.values(entityMap)
      .map(e => ({
        entity: e.entity,
        totalInvoiced: e.totalInvoiced,
        activeClients: e.activeClientCount,
        arpu: e.activeClientCount > 0
          ? Math.round(e.totalInvoiced / e.activeClientCount)
          : 0,
      }))
      .filter(e => e.totalInvoiced > 0 || e.activeClients > 0)
      .sort((a, b) => b.arpu - a.arpu);

    // ── REPORT 6: TOP CLIENTS BY REVENUE ────────────────────────────────────
    const clientMap: Record<string, { clientId: string; clientName: string; totalInvoiced: number; totalPaid: number }> = {};
    invoices.forEach(inv => {
      if (!clientMap[inv.clientId]) {
        clientMap[inv.clientId] = {
          clientId: inv.clientId,
          clientName: inv.client.companyName,
          totalInvoiced: 0,
          totalPaid: 0,
        };
      }
      clientMap[inv.clientId].totalInvoiced += inv.totalAmount;
      clientMap[inv.clientId].totalPaid += inv.payments.reduce((s, p) => s + p.amount, 0);
    });

    const topClients = Object.values(clientMap)
      .map(c => ({
        ...c,
        outstanding: c.totalInvoiced - c.totalPaid,
        collectionRate: c.totalInvoiced > 0
          ? Math.round((c.totalPaid / c.totalInvoiced) * 100)
          : 0,
      }))
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
      .slice(0, 10);

    // ── REPORT 7: PAYMENT METHOD BREAKDOWN ──────────────────────────────────
    const methodMap: Record<string, { method: string; count: number; totalAmount: number }> = {};
    invoices.forEach(inv => {
      inv.payments.forEach(p => {
        const method = p.method || 'Unknown';
        if (!methodMap[method]) methodMap[method] = { method, count: 0, totalAmount: 0 };
        methodMap[method].count++;
        methodMap[method].totalAmount += p.amount;
      });
    });
    const paymentMethods = Object.values(methodMap).sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      data: {
        kpis: {
          totalInvoiced,
          totalCollected,
          totalOutstanding,
          collectionRate,
          overdueAmount,
          avgDaysToPayment,
        },
        monthlyTrend,
        statusDistribution,
        revenueComparison,
        agedReceivables,
        agedBuckets,
        arpuByEntity,
        topClients,
        paymentMethods,
      },
    });

  } catch (error) {
    console.error('Failed to fetch billing reports', error);
    return NextResponse.json({ error: 'Failed to fetch billing reports' }, { status: 500 });
  }
}
```

---

## STEP 3 — Build the Billing & Revenue Page

**File to create:** `src/app/(dashboard)/reports/billing/page.tsx`

### Page Layout

```
┌──────────────────────────────────────────────────────┐
│  KPI Bar (6 summary cards)                           │
├──────────────────────────────────────────────────────┤
│  Report 1: Monthly Collection Trend (full width)     │
├──────────────────────────────────────────────────────┤
│  Report 2: Invoice Status Dist. │ Report 7: Pay Method│
├──────────────────────────────────────────────────────┤
│  Report 3: Realized vs Pipeline (full width)         │
├──────────────────────────────────────────────────────┤
│  Report 5: ARPU by Entity │ Report 6: Top Clients    │
├──────────────────────────────────────────────────────┤
│  Report 4: Aged Receivables (full width table)       │
└──────────────────────────────────────────────────────┘
```

### Full Page Code

```tsx
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
                  formatter={(v: any, name: string) =>
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
```

---

## IMPORTANT NOTES FOR JULES

1. **Do not touch** any existing report pages (`financial`, `tasks`, `leads-pipeline`).

2. The only change to existing files is **one line** added to the `tabs` array in `reports/layout.tsx`.

3. All 7 reports use **real data from the database** — no hardcoded mock values.

4. Every chart and table has an appropriate **empty state** when no data exists. Never show broken or empty charts.

5. The `agedBuckets` summary cards above the aged receivables table use inline hex colors with opacity suffixes (`'#22c55e18'` = 10% opacity green fill). This is standard Tailwind-compatible inline style — do not try to convert to Tailwind classes.

6. The `revenueComparison` funnel (Report 3) is a **horizontal bar visualization**, not a recharts chart. It uses plain divs with inline `width` percentages scaled to the max value.

7. The ARPU chart (Report 5) uses `layout="vertical"` in recharts — XAxis becomes the numeric axis and YAxis becomes the category axis. Do not swap them.

---

## BUILD ORDER

1. `src/app/api/reports/billing/route.ts`
2. `src/app/(dashboard)/reports/layout.tsx` — add one tab line
3. `src/app/(dashboard)/reports/billing/page.tsx`

---

## VERIFICATION

- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `/reports/billing` tab appears in the tab nav alongside the other 3 tabs
- [ ] All 6 KPI cards render
- [ ] Monthly Collection Trend chart renders (grouped bar)
- [ ] Invoice Status Distribution pie renders
- [ ] Payment Method Breakdown pie renders
- [ ] Revenue Funnel horizontal bars render
- [ ] ARPU by Entity horizontal bar chart renders
- [ ] Top Clients leaderboard renders with progress bars
- [ ] Aged Receivables bucket summary cards render
- [ ] Aged Receivables table renders with correct bucket badge colors
- [ ] All empty states show correctly when no data exists
- [ ] Existing report tabs (Leads & Pipeline, Financial, Tasks) still work unchanged
