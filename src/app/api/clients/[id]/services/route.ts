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

    const rateCards = await prisma.clientRateCard.findMany({
      where: { clientId: resolvedParams.id },
      include: {
        service: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: rateCards });
  } catch (error) {
    console.error('Failed to fetch client services', error);
    return NextResponse.json({ error: 'Failed to fetch client services' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();
    const { serviceId, customPrice } = body;

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    // Check if the rate card already exists
    const existing = await prisma.clientRateCard.findFirst({
      where: { clientId: resolvedParams.id, serviceId }
    });

    if (existing) {
      return NextResponse.json({ error: 'Service already assigned to this client' }, { status: 400 });
    }

    const rateCard = await prisma.clientRateCard.create({
      data: {
        clientId: resolvedParams.id,
        serviceId,
        customPrice: Number(customPrice) || 0,
      },
      include: {
        service: true
      }
    });

    return NextResponse.json({ data: rateCard });
  } catch (error) {
    console.error('Failed to assign client service', error);
    return NextResponse.json({ error: 'Failed to assign client service' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    await prisma.clientRateCard.deleteMany({
      where: {
        clientId: resolvedParams.id,
        serviceId,
      }
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to remove client service', error);
    return NextResponse.json({ error: 'Failed to remove client service' }, { status: 500 });
  }
}
