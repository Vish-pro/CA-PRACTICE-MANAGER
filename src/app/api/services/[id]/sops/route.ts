import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const sops = await prisma.serviceSOP.findMany({
      where: { serviceId: resolvedParams.id },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ data: sops });
  } catch (error) {
    console.error('Failed to fetch SOPs', error);
    return NextResponse.json({ error: 'Failed to fetch SOPs' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();

    // Check if service exists
    const service = await prisma.service.findUnique({ where: { id: resolvedParams.id } });
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

    const maxOrder = await prisma.serviceSOP.aggregate({
      where: { serviceId: resolvedParams.id },
      _max: { orderIndex: true }
    });

    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const sop = await prisma.serviceSOP.create({
      data: {
        serviceId: resolvedParams.id,
        title: body.title,
        description: body.description,
        orderIndex: body.orderIndex !== undefined ? body.orderIndex : nextOrder,
      }
    });

    // Update hasSOP on service
    await prisma.service.update({
      where: { id: resolvedParams.id },
      data: { hasSOP: true }
    });

    return NextResponse.json({ data: sop });
  } catch (error) {
    console.error('Failed to create SOP', error);
    return NextResponse.json({ error: 'Failed to create SOP' }, { status: 500 });
  }
}
