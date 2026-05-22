# PRABANDH — Reports Module Specification

> Hand this to Jules. Build the Reports module exactly as described below.
> Reports live ONLY under `/reports`. No report data appears anywhere else in the app.
> Tech stack unchanged: Next.js App Router, Prisma + SQLite, Tailwind, recharts, lucide-react.
> recharts is already installed — use it for all charts.

---

## OVERVIEW

The `/reports` page becomes a tabbed layout. Three tabs:

| Tab | Route | Status |
|-----|-------|--------|
| Leads & Pipeline | `/reports/leads-pipeline` | **Build this (spec below)** |
| Financial | `/reports/financial` | Already exists — keep as-is |
| Tasks | `/reports/tasks` | Already exists — keep as-is |

`/reports/page.tsx` currently redirects to `/reports/financial`. Change it to redirect to `/reports/leads-pipeline` instead.

Create a shared layout at `/reports/layout.tsx` that renders the tab navigation on every reports sub-page.

---

## FILE STRUCTURE

```
src/
  app/
    (dashboard)/
      reports/
        layout.tsx              ← NEW: tab nav wrapper
        page.tsx                ← MODIFY: redirect to /reports/leads-pipeline
        leads-pipeline/
          page.tsx              ← NEW: all 8 lead reports (build this)
        financial/
          page.tsx              ← EXISTS: keep untouched
        tasks/
          page.tsx              ← EXISTS: keep untouched
  app/
    api/
      reports/
        leads/
          route.ts              ← NEW: single endpoint returns all 8 datasets
```

---

## STEP 1 — Create Reports Layout with Tab Navigation

**File to create:** `src/app/(dashboard)/reports/layout.tsx`

```tsx
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
```

**File to modify:** `src/app/(dashboard)/reports/page.tsx`

Change the redirect from `/reports/financial` to `/reports/leads-pipeline`:
```ts
import { redirect } from "next/navigation";
export default function ReportsRootRedirect() {
  redirect("/reports/leads-pipeline");
}
```

---

## STEP 2 — Create the Leads & Pipeline API Endpoint

**File to create:** `src/app/api/reports/leads/route.ts`

This single endpoint returns all data needed for all 8 reports in one call.

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

    // Fetch all leads with assignedTo user
    const leads = await prisma.lead.findMany({
      include: { assignedTo: { select: { id: true, name: true } } }
    });

    // ── 1. CONVERSION VELOCITY ──────────────────────────────────────────────
    // Proxy: time from createdAt to updatedAt for CONVERTED leads
    const convertedLeads = leads.filter(l => l.stage === 'CONVERTED');
    const velocities = convertedLeads.map(l => {
      const ms = new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime();
      return Math.round(ms / (1000 * 60 * 60 * 24)); // days
    });
    const avgDaysToConvert = velocities.length > 0
      ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
      : 0;

    // Distribution buckets: 0-7 days, 8-14, 15-30, 31-60, 60+
    const velocityBuckets = [
      { label: '0–7 days',  count: velocities.filter(d => d <= 7).length },
      { label: '8–14 days', count: velocities.filter(d => d > 7 && d <= 14).length },
      { label: '15–30 days',count: velocities.filter(d => d > 14 && d <= 30).length },
      { label: '31–60 days',count: velocities.filter(d => d > 30 && d <= 60).length },
      { label: '60+ days',  count: velocities.filter(d => d > 60).length },
    ];

    // ── 2. DEAL VALUE BY ENTITY TYPE ────────────────────────────────────────
    const entityTypes = [...new Set(leads.map(l => l.businessEntity || 'Unknown'))];
    const dealValueByEntity = entityTypes.map(entity => {
      const entityLeads = leads.filter(l => (l.businessEntity || 'Unknown') === entity);
      return {
        entity,
        won: entityLeads
          .filter(l => l.stage === 'CONVERTED')
          .reduce((sum, l) => sum + (l.dealValue || 0), 0),
        pipeline: entityLeads
          .filter(l => !['CONVERTED', 'LOST'].includes(l.stage))
          .reduce((sum, l) => sum + (l.dealValue || 0), 0),
      };
    }).filter(e => e.won > 0 || e.pipeline > 0);

    // ── 3. DEAL TYPE REVENUE SPLIT ──────────────────────────────────────────
    const dealTypes = ['One-time', 'Recurring', 'Retainer'];
    const dealTypeSplit = dealTypes.map(type => ({
      type,
      value: leads
        .filter(l => l.dealType === type)
        .reduce((sum, l) => sum + (l.dealValue || 0), 0),
      count: leads.filter(l => l.dealType === type).length,
    }));
    // Add "Not Set" bucket
    dealTypeSplit.push({
      type: 'Not Set',
      value: leads.filter(l => !l.dealType).reduce((sum, l) => sum + (l.dealValue || 0), 0),
      count: leads.filter(l => !l.dealType).length,
    });

    // ── 4. LEAD SCORE PERFORMANCE ───────────────────────────────────────────
    const scoreBuckets = [
      { label: '0–20',  min: 0,  max: 20  },
      { label: '21–40', min: 21, max: 40  },
      { label: '41–60', min: 41, max: 60  },
      { label: '61–80', min: 61, max: 80  },
      { label: '81–100',min: 81, max: 100 },
    ];
    const leadScorePerformance = scoreBuckets.map(bucket => {
      const inBucket = leads.filter(l => l.leadScore >= bucket.min && l.leadScore <= bucket.max);
      const converted = inBucket.filter(l => l.stage === 'CONVERTED').length;
      return {
        label: bucket.label,
        total: inBucket.length,
        converted,
        conversionRate: inBucket.length > 0
          ? Math.round((converted / inBucket.length) * 100)
          : 0,
      };
    });

    // ── 5. SOURCE EFFECTIVENESS ─────────────────────────────────────────────
    const sources = [...new Set(leads.map(l => l.source || 'Unknown'))];
    const sourceEffectiveness = sources.map(source => {
      const sourceLeads = leads.filter(l => (l.source || 'Unknown') === source);
      const converted = sourceLeads.filter(l => l.stage === 'CONVERTED').length;
      return {
        source,
        total: sourceLeads.length,
        converted,
        conversionRate: sourceLeads.length > 0
          ? Math.round((converted / sourceLeads.length) * 100)
          : 0,
        totalDealValue: sourceLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0),
      };
    }).sort((a, b) => b.converted - a.converted);

    // ── 6. LEAD FUNNEL DROP-OFF ──────────────────────────────────────────────
    const stageOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
    const funnelData = stageOrder.map(stage => ({
      stage,
      count: leads.filter(l => l.stage === stage).length,
    }));

    // ── 7. STAFF CONVERSION LEADERBOARD ────────────────────────────────────
    const staffMap: Record<string, { name: string; total: number; converted: number }> = {};
    leads.forEach(l => {
      if (!l.assignedToId || !l.assignedTo) return;
      if (!staffMap[l.assignedToId]) {
        staffMap[l.assignedToId] = { name: l.assignedTo.name || 'Unknown', total: 0, converted: 0 };
      }
      staffMap[l.assignedToId].total++;
      if (l.stage === 'CONVERTED') staffMap[l.assignedToId].converted++;
    });
    const staffLeaderboard = Object.values(staffMap)
      .map(s => ({
        ...s,
        conversionRate: s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.converted - a.converted);

    // ── 8. MONTHLY LEAD VOLUME TREND ────────────────────────────────────────
    const monthlyMap: Record<string, { month: string; newLeads: number; converted: number }> = {};
    leads.forEach(l => {
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!monthlyMap[key]) monthlyMap[key] = { month: label, newLeads: 0, converted: 0 };
      monthlyMap[key].newLeads++;
      if (l.stage === 'CONVERTED') monthlyMap[key].converted++;
    });
    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // ── SUMMARY KPIs ────────────────────────────────────────────────────────
    const totalLeads = leads.length;
    const totalConverted = leads.filter(l => l.stage === 'CONVERTED').length;
    const totalLost = leads.filter(l => l.stage === 'LOST').length;
    const totalPipelineValue = leads
      .filter(l => !['CONVERTED', 'LOST'].includes(l.stage))
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const totalWonValue = leads
      .filter(l => l.stage === 'CONVERTED')
      .reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const overallConversionRate = totalLeads > 0
      ? Math.round((totalConverted / totalLeads) * 100)
      : 0;

    return NextResponse.json({
      data: {
        kpis: {
          totalLeads,
          totalConverted,
          totalLost,
          overallConversionRate,
          avgDaysToConvert,
          totalPipelineValue,
          totalWonValue,
        },
        velocityBuckets,
        dealValueByEntity,
        dealTypeSplit,
        leadScorePerformance,
        sourceEffectiveness,
        funnelData,
        staffLeaderboard,
        monthlyTrend,
      }
    });

  } catch (error) {
    console.error('Failed to fetch lead reports', error);
    return NextResponse.json({ error: 'Failed to fetch lead reports' }, { status: 500 });
  }
}
```

---

## STEP 3 — Build the Leads & Pipeline Page

**File to create:** `src/app/(dashboard)/reports/leads-pipeline/page.tsx`

### Page Layout

The page is a single scrollable column. Structure top to bottom:

```
┌──────────────────────────────────────────────────────┐
│  KPI Bar (6 summary cards in a row)                  │
├──────────────────────────────────────────────────────┤
│  Report 8: Monthly Lead Volume Trend  (full width)   │
├──────────────────────────────────────────────────────┤
│  Report 6: Funnel Drop-off  │  Report 7: Leaderboard │
├──────────────────────────────────────────────────────┤
│  Report 2: Deal Value by Entity  │  Report 3: Deal   │
│                                  │  Type Split       │
├──────────────────────────────────────────────────────┤
│  Report 5: Source Effectiveness (full width table)   │
├──────────────────────────────────────────────────────┤
│  Report 4: Lead Score Performance (full width)       │
├──────────────────────────────────────────────────────┤
│  Report 1: Conversion Velocity (full width)          │
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
  TrendingUp, Users, CheckCircle, XCircle,
  Clock, DollarSign, Target, Award
} from "lucide-react";

// ── Color palette (consistent across all charts) ────────────────────────────
const COLORS = {
  primary:   "#6366f1", // indigo
  green:     "#22c55e",
  orange:    "#f59e0b",
  red:       "#ef4444",
  blue:      "#3b82f6",
  purple:    "#a855f7",
  cyan:      "#06b6d4",
  pink:      "#ec4899",
};
const PIE_COLORS = [COLORS.primary, COLORS.green, COLORS.orange, COLORS.red, COLORS.blue, COLORS.purple];

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color
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

// ── Section Card ────────────────────────────────────────────────────────────
function ReportCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

// ── Format currency ──────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}k`
    : `₹${n}`;

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsPipelineReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/leads')
      .then(r => r.json())
      .then(json => { if (json.data) setData(json.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        Loading report data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        Failed to load report data.
      </div>
    );
  }

  const { kpis, velocityBuckets, dealValueByEntity, dealTypeSplit,
    leadScorePerformance, sourceEffectiveness, funnelData,
    staffLeaderboard, monthlyTrend } = data;

  return (
    <div className="space-y-6 pb-10">

      {/* ── KPI BAR ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Leads"       value={kpis.totalLeads}              icon={Users}      color="bg-blue-100 text-blue-600" />
        <KpiCard label="Converted"         value={kpis.totalConverted}           icon={CheckCircle} color="bg-green-100 text-green-600" />
        <KpiCard label="Lost"              value={kpis.totalLost}                icon={XCircle}    color="bg-red-100 text-red-600" />
        <KpiCard label="Conversion Rate"   value={`${kpis.overallConversionRate}%`} icon={Target}  color="bg-indigo-100 text-indigo-600" />
        <KpiCard label="Avg Days to Close" value={`${kpis.avgDaysToConvert}d`}   icon={Clock}      color="bg-orange-100 text-orange-600" sub="for converted leads" />
        <KpiCard label="Pipeline Value"    value={fmt(kpis.totalPipelineValue)}  icon={DollarSign} color="bg-cyan-100 text-cyan-600" sub={`Won: ${fmt(kpis.totalWonValue)}`} />
      </div>

      {/* ── REPORT 8: MONTHLY TREND ──────────────────────────────────────── */}
      <ReportCard
        title="Monthly Lead Volume Trend"
        subtitle="New leads vs conversions per month"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Legend />
              <Bar dataKey="newLeads"  name="New Leads"  fill={COLORS.blue}  radius={[4, 4, 0, 0]} />
              <Bar dataKey="converted" name="Converted"  fill={COLORS.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {monthlyTrend.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-6">No lead data available yet.</p>
        )}
      </ReportCard>

      {/* ── REPORTS 6 + 7: FUNNEL + LEADERBOARD (side by side) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Report 6 — Funnel */}
        <ReportCard
          title="Lead Funnel Drop-off"
          subtitle="How many leads reach each stage"
        >
          <div className="space-y-3 pt-2">
            {(() => {
              const max = Math.max(...funnelData.map((s: any) => s.count), 1);
              const stageColors: Record<string, string> = {
                NEW: COLORS.blue, CONTACTED: COLORS.cyan,
                QUALIFIED: COLORS.purple, CONVERTED: COLORS.green, LOST: COLORS.red,
              };
              return funnelData.map((stage: any) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{stage.stage.charAt(0) + stage.stage.slice(1).toLowerCase()}</span>
                    <span className="text-muted-foreground font-semibold">{stage.count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-6 rounded-full transition-all flex items-center pl-3"
                      style={{
                        width: `${Math.max((stage.count / max) * 100, stage.count > 0 ? 8 : 0)}%`,
                        backgroundColor: stageColors[stage.stage] || COLORS.primary,
                      }}
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </ReportCard>

        {/* Report 7 — Staff Leaderboard */}
        <ReportCard
          title="Staff Conversion Leaderboard"
          subtitle="Ranked by number of leads converted"
        >
          {staffLeaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">No assigned leads yet.</p>
          ) : (
            <div className="space-y-4 pt-1">
              {staffLeaderboard.map((s: any, i: number) => (
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
                      <span className="font-medium truncate">{s.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {s.converted}/{s.total} · <span className="text-green-600 font-semibold">{s.conversionRate}%</span>
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-green-500"
                        style={{ width: `${s.conversionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ReportCard>
      </div>

      {/* ── REPORTS 2 + 3: ENTITY VALUE + DEAL TYPE (side by side) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Report 2 — Deal Value by Entity */}
        <ReportCard
          title="Deal Value Pipeline by Entity Type"
          subtitle="Won revenue vs active pipeline — grouped by business entity"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealValueByEntity} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDashboard="3 3" vertical={false} />
                <XAxis dataKey="entity" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar dataKey="won"      name="Won"      fill={COLORS.green}  radius={[4, 4, 0, 0]} />
                <Bar dataKey="pipeline" name="Pipeline" fill={COLORS.blue}   radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {dealValueByEntity.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-6">No deal value data yet.</p>
          )}
        </ReportCard>

        {/* Report 3 — Deal Type Split */}
        <ReportCard
          title="Deal Type Revenue Split"
          subtitle="Projected revenue by deal structure"
        >
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie
                  data={dealTypeSplit.filter((d: any) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dealTypeSplit.filter((d: any) => d.value > 0).map((_: any, index: number) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 pl-2">
              {dealTypeSplit.filter((d: any) => d.value > 0 || d.count > 0).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="flex-1 text-muted-foreground">{d.type}</span>
                  <span className="font-semibold">{fmt(d.value)}</span>
                </div>
              ))}
              {dealTypeSplit.every((d: any) => d.value === 0) && (
                <p className="text-sm text-muted-foreground italic">No deal value data yet.</p>
              )}
            </div>
          </div>
        </ReportCard>
      </div>

      {/* ── REPORT 5: SOURCE EFFECTIVENESS TABLE ────────────────────────── */}
      <ReportCard
        title="Source Effectiveness"
        subtitle="Which lead sources generate the most conversions and revenue"
      >
        {sourceEffectiveness.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">No source data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 font-medium">Source</th>
                  <th className="text-right py-2 font-medium">Total Leads</th>
                  <th className="text-right py-2 font-medium">Converted</th>
                  <th className="text-right py-2 font-medium">Conversion Rate</th>
                  <th className="text-right py-2 font-medium">Total Deal Value</th>
                </tr>
              </thead>
              <tbody>
                {sourceEffectiveness.map((s: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">{s.source}</td>
                    <td className="py-3 text-right text-muted-foreground">{s.total}</td>
                    <td className="py-3 text-right text-green-600 font-semibold">{s.converted}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-muted rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${s.conversionRate}%` }} />
                        </div>
                        <span className="font-semibold w-10 text-right">{s.conversionRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-semibold">{s.totalDealValue > 0 ? fmt(s.totalDealValue) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportCard>

      {/* ── REPORT 4: LEAD SCORE PERFORMANCE ────────────────────────────── */}
      <ReportCard
        title="Lead Score Performance"
        subtitle="Do higher lead scores actually convert better? Conversion rate by score bucket."
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadScorePerformance} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left"  domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                formatter={(value: any, name: string) =>
                  name === 'Conversion Rate' ? `${value}%` : value
                }
              />
              <Legend />
              <Bar yAxisId="right" dataKey="total"          name="Total Leads"     fill={COLORS.blue}    radius={[4, 4, 0, 0]} opacity={0.5} />
              <Bar yAxisId="left"  dataKey="conversionRate" name="Conversion Rate" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {leadScorePerformance.every((b: any) => b.total === 0) && (
          <p className="text-sm text-muted-foreground italic text-center py-6">No lead score data yet — update lead scores to see this report.</p>
        )}
      </ReportCard>

      {/* ── REPORT 1: CONVERSION VELOCITY ────────────────────────────────── */}
      <ReportCard
        title="Lead Conversion Velocity"
        subtitle="How long it takes to convert a lead — distribution of converted leads by days taken"
      >
        <div className="flex items-center gap-6 mb-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-6 py-4 text-center">
            <div className="text-3xl font-bold text-indigo-700">{kpis.avgDaysToConvert}</div>
            <div className="text-xs text-indigo-600 mt-1">Avg days to convert</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-6 py-4 text-center">
            <div className="text-3xl font-bold text-green-700">{kpis.totalConverted}</div>
            <div className="text-xs text-green-600 mt-1">Total conversions</div>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={velocityBuckets} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="count" name="Conversions" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {kpis.totalConverted === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-6">No converted leads yet.</p>
        )}
      </ReportCard>

    </div>
  );
}
```

---

## IMPORTANT NOTES FOR JULES

1. **Do not touch** `/reports/financial/page.tsx` or `/reports/tasks/page.tsx` — they keep working as-is under the new tab layout.

2. The `reports/layout.tsx` wraps ALL sub-pages, so the tab nav appears automatically on Financial and Tasks pages too without any changes to those files.

3. The existing `Card`, `CardContent`, `CardHeader`, `CardTitle` imports in the financial page come from `@/components/ui/card`. That component may not exist. If it doesn't, the financial page already works so leave it. Do not create a `card.tsx` component unless it already exists.

4. All 8 reports use **real data from the database** — no hardcoded mock values.

5. If there are zero leads in the database, every chart shows an appropriate "No data yet" empty state — do not show broken/empty charts.

6. The `CartesianGrid strokeDashboard` in the entity chart is intentional recharts prop — double check and use `strokeDasharray` if it throws a TS error.

---

## BUILD ORDER

1. Create `src/app/api/reports/leads/route.ts`
2. Modify `src/app/(dashboard)/reports/page.tsx` (redirect change)
3. Create `src/app/(dashboard)/reports/layout.tsx`
4. Create `src/app/(dashboard)/reports/leads-pipeline/page.tsx`

---

## VERIFICATION

- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `/reports` redirects to `/reports/leads-pipeline`
- [ ] Tab nav shows on all 3 report tabs (Leads & Pipeline, Financial, Tasks)
- [ ] All 8 report sections render without console errors
- [ ] Empty state messages show when no data exists
- [ ] `/reports/financial` and `/reports/tasks` still work exactly as before
