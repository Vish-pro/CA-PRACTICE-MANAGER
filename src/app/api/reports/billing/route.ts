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
