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
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (stage && stage !== 'ALL') {
      where.stage = stage;
    }
    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { contactName: { contains: search } },
        { contactEmail: { contains: search } }
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });

    const total = await prisma.lead.count({ where });

    // Also fetch stats for the stats bar
    const stats = {
      open: await prisma.lead.count({ where: { stage: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] } } }),
      converted: await prisma.lead.count({ where: { stage: 'CONVERTED' } }),
      lost: await prisma.lead.count({ where: { stage: 'LOST' } }),
      total: await prisma.lead.count(),
    };

    return NextResponse.json({ data: leads, total, page, limit, stats });
  } catch (error) {
    console.error('Failed to fetch leads', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const lead = await prisma.$transaction(async (tx) => {
      // 1. Increment counter for leads (using 'lead' counter, though spec doesn't explicitly mention 'lead' counter, it mentions leadNumber auto-increment. We used @unique instead of autoincrement in SQLite)
      const counter = await tx.counter.upsert({
        where: { id: 'lead' },
        update: { value: { increment: 1 } },
        create: { id: 'lead', value: 1 }
      });

      // 2. Create Lead
      return await tx.lead.create({
        data: {
          leadNumber: counter.value,
          businessName: body.businessName,
          legalName: body.legalName,
          businessEntity: body.businessEntity,
          contactName: body.contactName,
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone,
          source: body.source,
          stage: body.stage || 'NEW',
          dealValue: body.dealValue ? parseFloat(body.dealValue) : null,
          dealType: body.dealType,
          assignedToId: body.assignedToId,
          notes: body.notes,
        }
      });
    });

    return NextResponse.json({ data: lead });
  } catch (error) {
    console.error('Failed to create lead', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
