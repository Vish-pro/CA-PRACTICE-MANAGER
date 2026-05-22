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
      prisma.task.count({
        where: {
          status: 'PENDING',
          OR: [{ dueDate: { gte: now } }, { dueDate: null }]
        }
      }),
      prisma.task.count({
        where: {
          status: 'IN_PROGRESS',
          OR: [{ dueDate: { gte: now } }, { dueDate: null }]
        }
      }),
      prisma.task.count({
        where: {
          status: 'SENT_FOR_REVIEW',
          OR: [{ dueDate: { gte: now } }, { dueDate: null }]
        }
      }),
      prisma.task.count({
        where: {
          status: 'REQUEST_CHANGES',
          OR: [{ dueDate: { gte: now } }, { dueDate: null }]
        }
      }),
      prisma.task.count({
        where: {
          OR: [
            { status: 'OVERDUE' },
            {
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
              dueDate: { lt: now }
            }
          ]
        }
      }),
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
