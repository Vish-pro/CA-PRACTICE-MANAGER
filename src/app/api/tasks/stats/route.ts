import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // End of week (Saturday)

    const [
      total,
      pending,
      inProgress,
      sentForReview,
      requestChanges,
      overdue,
      completed,
      cancelled,
      categoryGroups,
      assigneeGroups,
      dueThisWeek,
      overdueTasksList
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'SENT_FOR_REVIEW' } }),
      prisma.task.count({ where: { status: 'REQUEST_CHANGES' } }),
      prisma.task.count({ where: { status: 'OVERDUE' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: 'CANCELLED' } }),
      prisma.task.groupBy({
        by: ['category'],
        _count: { _all: true }
      }),
      prisma.task.groupBy({
        by: ['assignedToId'],
        _count: { _all: true },
        orderBy: { _count: { assignedToId: 'desc' } },
        take: 5
      }),
      prisma.task.findMany({
        where: {
          dueDate: { gte: startOfWeek, lte: endOfWeek },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        },
        include: {
          client: { select: { companyName: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      }),
      prisma.task.findMany({
        where: { status: 'OVERDUE' },
        include: {
          client: { select: { companyName: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      })
    ]);

    // Resolve assignee names
    const assigneeIds = assigneeGroups.map(g => g.assignedToId).filter(Boolean) as string[];
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true }
    });

    const tasksByAssignee = assigneeGroups.map(g => {
      const user = assignees.find(u => u.id === g.assignedToId);
      return {
        name: user?.name || 'Unassigned',
        count: g._count._all
      };
    });

    const tasksByCategory = categoryGroups.map(g => ({
      name: g.category || 'Uncategorized',
      count: g._count._all
    }));

    return NextResponse.json({
      total,
      pending,
      inProgress,
      sentForReview,
      requestChanges,
      overdue,
      completed,
      cancelled,
      tasksByCategory,
      tasksByAssignee,
      dueThisWeek,
      overdueTasksList
    });
  } catch (error) {
    console.error('Failed to fetch task stats', error);
    return NextResponse.json({ error: 'Failed to fetch task stats' }, { status: 500 });
  }
}
