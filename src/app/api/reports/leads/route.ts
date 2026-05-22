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
