import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [
      total,
      pending,
      inProgress,
      sentForReview,
      requestChanges,
      overdue,
      completed,
      cancelled
    ] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { status: 'SENT_FOR_REVIEW' } }),
      prisma.task.count({ where: { status: 'REQUEST_CHANGES' } }),
      prisma.task.count({ where: { status: 'OVERDUE' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: 'CANCELLED' } }),
    ]);

    return NextResponse.json({
      total,
      pending,
      inProgress,
      sentForReview,
      requestChanges,
      overdue,
      completed,
      cancelled
    });
  } catch (error) {
    console.error('Failed to fetch task stats', error);
    return NextResponse.json({ error: 'Failed to fetch task stats' }, { status: 500 });
  }
}
