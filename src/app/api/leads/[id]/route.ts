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

    const lead = await prisma.lead.findUnique({
      where: { id: resolvedParams.id },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });

    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: lead });
  } catch (error) {
    console.error('Failed to fetch lead', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();

    const lead = await prisma.lead.update({
      where: { id: resolvedParams.id },
      data: {
        businessName: body.businessName,
        legalName: body.legalName,
        businessEntity: body.businessEntity,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        source: body.source,
        stage: body.stage,
        dealValue: body.dealValue !== undefined ? parseFloat(body.dealValue) : undefined,
        dealType: body.dealType,
        assignedToId: body.assignedToId,
        notes: body.notes,
      }
    });

    return NextResponse.json({ data: lead });
  } catch (error) {
    console.error('Failed to update lead', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    await prisma.lead.delete({ where: { id: resolvedParams.id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to delete lead', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
