import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



export async function PUT(request: Request, { params }: { params: Promise<{ id: string, sopId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();

    const sop = await prisma.serviceSOP.update({
      where: { id: resolvedParams.sopId, serviceId: resolvedParams.id },
      data: {
        title: body.title,
        description: body.description,
        orderIndex: body.orderIndex,
      }
    });

    return NextResponse.json({ data: sop });
  } catch (error) {
    console.error('Failed to update SOP', error);
    return NextResponse.json({ error: 'Failed to update SOP' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, sopId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    await prisma.serviceSOP.delete({
      where: { id: resolvedParams.sopId, serviceId: resolvedParams.id }
    });

    // Check if any SOPs remain to update hasSOP
    const remainingCount = await prisma.serviceSOP.count({
      where: { serviceId: resolvedParams.id }
    });

    if (remainingCount === 0) {
      await prisma.service.update({
        where: { id: resolvedParams.id },
        data: { hasSOP: false }
      });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to delete SOP', error);
    return NextResponse.json({ error: 'Failed to delete SOP' }, { status: 500 });
  }
}
