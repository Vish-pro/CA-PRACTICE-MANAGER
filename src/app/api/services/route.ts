import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (category && category !== 'All') where.category = category;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.name = { contains: search };
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { sopSteps: true, tasks: true, rateCards: true }
        }
      }
    });

    const data = services.map(s => ({
      ...s,
      hasSOP: s._count.sopSteps > 0,
      hasSubtasks: s._count.tasks > 0,
      assignedClients: s._count.rateCards,
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error('Failed to fetch services', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Only ADMIN can create locked services
    if (body.isLocked && session.user.role !== 'ADMIN') {
      body.isLocked = false;
    }

    const service = await prisma.service.create({
      data: {
        name: body.name,
        category: body.category,
        frequency: body.frequency,
        professionalFee: body.professionalFee || 0,
        description: body.description,
        isActive: body.isActive !== undefined ? body.isActive : true,
        isLocked: body.isLocked || false,
      }
    });

    return NextResponse.json({ data: service });
  } catch (error) {
    console.error('Failed to create service', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
