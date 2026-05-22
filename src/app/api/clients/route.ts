import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const activity = searchParams.get('activity');

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (activity === 'active') {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { legalName: { contains: search } },
        { contactName: { contains: search } },
        { contactEmail: { contains: search } },
        { clientCode: { contains: search } }
      ];
    }

    const clients = await prisma.clientProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        auditor: { select: { id: true, name: true } },
        _count: { select: { tasks: true, invoices: true, documents: true } }
      }
    });

    const total = await prisma.clientProfile.count({ where });

    // Stats
    const totalClients = await prisma.clientProfile.count({ where: { isActive: true } });

    // Current month start
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newClientsThisMonth = await prisma.clientProfile.count({
      where: { createdAt: { gte: startOfMonth } }
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Very simplified active/inactive calculation for now:
    // In a real scenario we'd query tasks/activity within 90 days.
    const active90Days = await prisma.clientProfile.count({
      where: {
        OR: [
          { lastActivityAt: { gte: ninetyDaysAgo } },
          { tasks: { some: { createdAt: { gte: ninetyDaysAgo } } } }
        ]
      }
    });

    const noActivity90Days = totalClients - active90Days;

    const stats = {
      total: totalClients,
      newThisMonth: newClientsThisMonth,
      active90Days,
      noActivity90Days
    };

    return NextResponse.json({ data: clients, total, page, limit, stats });
  } catch (error) {
    console.error('Failed to fetch clients', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Creating a client is somewhat complex as we did in Lead Convert.
  // It's similar, minus the lead conversion logic.
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // To prevent duplication, we can reuse logic or extract.
    // For brevity, using simplified approach here.
    return NextResponse.json({ error: 'Use Lead Conversion for creating clients' }, { status: 400 });
  } catch (error) {
    console.error('Failed to create client', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
