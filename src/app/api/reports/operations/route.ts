import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();

    // Fetch all tasks with relations
    const tasks = await prisma.task.findMany({
      include: {
        assignedTo: { select: { id: true, name: true } },
        service:    { select: { id: true, name: true, category: true } },
        client:     { select: { id: true, companyName: true } },
      },
    });

    // Fetch all leads with assignee
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        assignedToId: true,
        assignedTo: { select: { id: true, name: true } },
        stage: true,
        businessName: true,
        dealValue: true,
        createdAt: true
      },
    });

    // Fetch all active clients with auditor
    const clients = await prisma.clientProfile.findMany({
      where: { isActive: true },
      select: {
        id: true,
        auditorId: true,
        auditor: { select: { id: true, name: true } },
      },
    });

    // Fetch all staff users (non-CLIENT, non-BILLING roles)
    const staff = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SENIOR_STAFF', 'JUNIOR_STAFF'] } },
      select: { id: true, name: true, role: true },
    });

    // ── REPORT 1: TEAM CAPACITY & ALLOCATION ─────────────────────────────────
    const activeStatuses = ['PENDING', 'IN_PROGRESS', 'REVIEW'];
    const teamCapacity = staff.map(member => {
      const memberTasks    = tasks.filter(t => t.assignedToId === member.id);
      const activeTasks    = memberTasks.filter(t => activeStatuses.includes(t.status)).length;
      const overdueTasks   = memberTasks.filter(t => t.status === 'OVERDUE').length;
      const completedTasks = memberTasks.filter(t => t.status === 'COMPLETED').length;
      const assignedLeads  = leads.filter(l => l.assignedToId === member.id && !['CONVERTED', 'LOST'].includes(l.stage)).length;
      const managedClients = clients.filter(c => c.auditorId === member.id).length;

      return {
        staffId:   member.id,
        name:      member.name || 'Unknown',
        role:      member.role,
        activeTasks,
        overdueTasks,
        completedTasks,
        assignedLeads,
        managedClients,
        totalLoad: activeTasks + overdueTasks,
      };
    }).sort((a, b) => b.totalLoad - a.totalLoad);

    // Unassigned counts
    const unassignedTasks  = tasks.filter(t => !t.assignedToId && activeStatuses.includes(t.status)).length;
    const unassignedLeads  = leads.filter(l => !l.assignedToId && !['CONVERTED', 'LOST'].includes(l.stage)).length;

    // ── REPORT 2: SERVICE DELIVERY TAT ────────────────────────────────────────
    const completedTasksWithService = tasks.filter(
      t => t.status === 'COMPLETED' && t.completedAt && t.service?.category
    );

    const categoryMap: Record<string, {
      category: string; totalDays: number; count: number;
      onTime: number; late: number;
    }> = {};

    completedTasksWithService.forEach(t => {
      const cat = t.service!.category;
      if (!categoryMap[cat]) categoryMap[cat] = { category: cat, totalDays: 0, count: 0, onTime: 0, late: 0 };

      const days = Math.max(0, Math.round(
        (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ));
      categoryMap[cat].totalDays += days;
      categoryMap[cat].count++;

      if (t.dueDate) {
        if (new Date(t.completedAt!) <= new Date(t.dueDate)) {
          categoryMap[cat].onTime++;
        } else {
          categoryMap[cat].late++;
        }
      }
    });

    const tatByCategory = Object.values(categoryMap)
      .map(c => ({
        category:    c.category,
        avgDays:     c.count > 0 ? Math.round(c.totalDays / c.count) : 0,
        totalTasks:  c.count,
        onTime:      c.onTime,
        late:        c.late,
        onTimeRate:  (c.onTime + c.late) > 0
          ? Math.round((c.onTime / (c.onTime + c.late)) * 100)
          : null, // null means no dueDate data for this category
      }))
      .sort((a, b) => b.avgDays - a.avgDays);

    // ── REPORT 3: STALE TASKS (BOTTLENECK ANALYSIS) ──────────────────────────
    // SOP thresholds (days): how long a task should sit in each status
    const SOP_THRESHOLDS: Record<string, number> = {
      PENDING:     3,
      IN_PROGRESS: 7,
      REVIEW:      3,
    };

    const staleTasks = tasks
      .filter(t => activeStatuses.includes(t.status))
      .map(t => {
        // Use statusChangedAt if available, fall back to createdAt
        const since = t.statusChangedAt
          ? new Date(t.statusChangedAt)
          : new Date(t.createdAt);
        const daysInStatus = Math.floor((now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
        const threshold = SOP_THRESHOLDS[t.status] ?? 7;
        const isStale = daysInStatus > threshold;
        const severity =
          daysInStatus > threshold * 3 ? 'critical' :
          daysInStatus > threshold * 2 ? 'high' :
          isStale ? 'medium' : 'ok';

        return {
          taskId:        t.id,
          title:         t.title,
          status:        t.status,
          priority:      t.priority,
          daysInStatus,
          threshold,
          isStale,
          severity,
          assigneeName:  t.assignedTo?.name ?? 'Unassigned',
          clientName:    t.client?.companyName ?? '—',
          category:      t.service?.category ?? '—',
          usingProxy:    !t.statusChangedAt, // true = fell back to createdAt
        };
      })
      .filter(t => t.isStale)
      .sort((a, b) => b.daysInStatus - a.daysInStatus);

    // Stale summary by status
    const staleSummary = activeStatuses.map(status => ({
      status,
      staleCount:  staleTasks.filter(t => t.status === status).length,
      totalActive: tasks.filter(t => t.status === status).length,
      threshold:   SOP_THRESHOLDS[status],
    }));

    // ── REPORT 4: ON-TIME COMPLETION RATE BY STAFF ───────────────────────────
    const completedWithDue = tasks.filter(
      t => t.status === 'COMPLETED' && t.completedAt && t.dueDate && t.assignedToId
    );

    const staffCompletionMap: Record<string, {
      staffId: string; name: string; total: number; onTime: number;
    }> = {};

    completedWithDue.forEach(t => {
      const id = t.assignedToId!;
      if (!staffCompletionMap[id]) {
        staffCompletionMap[id] = {
          staffId: id,
          name: t.assignedTo?.name ?? 'Unknown',
          total: 0,
          onTime: 0,
        };
      }
      staffCompletionMap[id].total++;
      if (new Date(t.completedAt!) <= new Date(t.dueDate!)) {
        staffCompletionMap[id].onTime++;
      }
    });

    const onTimeByStaff = Object.values(staffCompletionMap)
      .map(s => ({
        ...s,
        late:       s.total - s.onTime,
        onTimeRate: s.total > 0 ? Math.round((s.onTime / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.onTimeRate - a.onTimeRate);

    // ── REPORT 5: SERVICE CATEGORY WORKLOAD ──────────────────────────────────
    const openStatuses = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'OVERDUE'];
    const workloadMap: Record<string, {
      category: string;
      PENDING: number; IN_PROGRESS: number;
      REVIEW: number; OVERDUE: number; total: number;
    }> = {};

    tasks
      .filter(t => openStatuses.includes(t.status) && t.service?.category)
      .forEach(t => {
        const cat = t.service!.category;
        if (!workloadMap[cat]) {
          workloadMap[cat] = { category: cat, PENDING: 0, IN_PROGRESS: 0, REVIEW: 0, OVERDUE: 0, total: 0 };
        }
        workloadMap[cat][t.status as keyof typeof workloadMap[typeof cat]]++;
        workloadMap[cat].total++;
      });

    // Tasks with no service (uncategorised)
    const uncategorised = tasks.filter(t => openStatuses.includes(t.status) && !t.service?.category);
    if (uncategorised.length > 0) {
      workloadMap['Uncategorised'] = {
        category: 'Uncategorised', PENDING: 0, IN_PROGRESS: 0, REVIEW: 0, OVERDUE: 0, total: 0,
      };
      uncategorised.forEach(t => {
        workloadMap['Uncategorised'][t.status as keyof typeof workloadMap['Uncategorised']]++;
        workloadMap['Uncategorised'].total++;
      });
    }

    const categoryWorkload = Object.values(workloadMap).sort((a, b) => b.total - a.total);

    // Urgency Workload (filings due in 2 days, 5 days, 7+ days)
    const urgencyMap: Record<string, {
      category: string;
      'Due 2d': number; 'Due 5d': number; 'Due 7d': number; '7d+': number; total: number;
    }> = {};

    tasks
      .filter(t => openStatuses.includes(t.status))
      .forEach(t => {
        const cat = t.service?.category || 'Uncategorised';
        if (!urgencyMap[cat]) {
          urgencyMap[cat] = { category: cat, 'Due 2d': 0, 'Due 5d': 0, 'Due 7d': 0, '7d+': 0, total: 0 };
        }
        
        urgencyMap[cat].total++;
        if (!t.dueDate) {
          urgencyMap[cat]['7d+']++;
        } else {
          const diffMs = new Date(t.dueDate).getTime() - now.getTime();
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          if (daysRemaining <= 2) {
            urgencyMap[cat]['Due 2d']++;
          } else if (daysRemaining <= 5) {
            urgencyMap[cat]['Due 5d']++;
          } else if (daysRemaining <= 7) {
            urgencyMap[cat]['Due 7d']++;
          } else {
            urgencyMap[cat]['7d+']++;
          }
        }
      });
    const urgencyWorkload = Object.values(urgencyMap).sort((a, b) => b.total - a.total);

    // Unassigned Lists for Drill-down Drawer
    const unassignedTasksList = tasks
      .filter(t => !t.assignedToId && openStatuses.includes(t.status))
      .map(t => ({
        id: t.id,
        title: t.title,
        category: t.service?.category || 'General Practice',
        clientName: t.client?.companyName || 'Internal Firm',
        createdAt: t.createdAt.toISOString()
      }));

    const unassignedLeadsList = leads
      .filter(l => !l.assignedToId && !['CONVERTED', 'LOST'].includes(l.stage))
      .map(l => ({
        id: l.id,
        businessName: l.businessName || 'Unnamed Prospect',
        dealValue: l.dealValue || 0,
        stage: l.stage,
        createdAt: l.createdAt ? l.createdAt.toISOString() : now.toISOString()
      }));

    // Pending Partner Review count
    const pendingReviewTasks = tasks.filter(t => t.status === 'REVIEW').length;

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const totalActiveTasks  = tasks.filter(t => activeStatuses.includes(t.status)).length;
    const totalOverdueTasks = tasks.filter(t => t.status === 'OVERDUE').length;
    const totalStaleTasks   = staleTasks.length;
    const avgTAT            = tatByCategory.length > 0
      ? Math.round(tatByCategory.reduce((s, c) => s + c.avgDays, 0) / tatByCategory.length)
      : 0;
    const overallOnTimeRate = onTimeByStaff.length > 0
      ? Math.round(
          onTimeByStaff.reduce((s, st) => s + st.onTime, 0) /
          onTimeByStaff.reduce((s, st) => s + st.total, 0) * 100
        )
      : 0;

    return NextResponse.json({
      data: {
        kpis: {
          totalActiveTasks,
          totalOverdueTasks,
          totalStaleTasks,
          avgTAT,
          overallOnTimeRate,
          unassignedTasks,
          unassignedLeads,
          pendingReviewTasks,
        },
        teamCapacity,
        tatByCategory,
        staleTasks,
        staleSummary,
        onTimeByStaff,
        categoryWorkload,
        urgencyWorkload,
        unassignedTasksList,
        unassignedLeadsList,
      },
    });

  } catch (error) {
    console.error('Failed to fetch operations reports', error);
    return NextResponse.json({ error: 'Failed to fetch operations reports' }, { status: 500 });
  }
}
