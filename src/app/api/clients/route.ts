import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';



export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const activity = searchParams.get('activity');
    const groupId = searchParams.get('groupId');

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (activity === 'active') {
      where.isActive = true;
    }
    if (groupId) {
      where.groupId = groupId;
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
        rateCards: { include: { service: true } },
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
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const client = await prisma.$transaction(async (tx) => {
      let prefix = 'OTH';
      const entity = body.businessEntity || '';
      if (entity.includes('Public Limited')) prefix = 'PLC';
      else if (entity.includes('Private Limited')) prefix = 'PVT';
      else if (entity.includes('Partnership')) prefix = 'PAR';
      else if (entity.includes('LLP')) prefix = 'LLP';
      else if (entity.includes('Proprietorship')) prefix = 'PRO';
      else if (entity.includes('Trust')) prefix = 'TRS';
      else if (entity.includes('HUF')) prefix = 'HUF';

      const counterId = `client_${prefix}`;
      const counter = await tx.counter.upsert({
        where: { id: counterId },
        update: { value: { increment: 1 } },
        create: { id: counterId, value: 1 }
      });
      const clientCode = `${prefix}${String(counter.value).padStart(5, '0')}`;

      const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      const clientUser = await tx.user.create({
        data: {
          email: body.contactEmail || `client_${clientCode}@prabandh.in`,
          passwordHash,
          name: body.contactName || body.businessName,
          role: 'CLIENT',
        }
      });

      return await tx.clientProfile.create({
        data: {
          userId: clientUser.id,
          companyName: body.businessName,
          clientCode,
          legalName: body.legalName,
          businessEntity: body.businessEntity,
          contactName: body.contactName,
          contactEmail: body.contactEmail,
          mobile: body.mobile,
          gstNumber: body.gstNumber,
          panNumber: body.panNumber,
          address: body.address,
          auditorId: body.auditorId || null,
          groupId: body.groupId || null,
          labels: body.labels || null,
        }
      });
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Failed to create client', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
