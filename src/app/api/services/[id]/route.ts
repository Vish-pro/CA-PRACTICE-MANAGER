import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();
    const id = resolvedParams.id;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Only ADMIN can change locked status
    if (body.isLocked !== undefined && session.user.role !== 'ADMIN') {
      delete body.isLocked;
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category,
        frequency: body.frequency,
        professionalFee: body.professionalFee,
        description: body.description,
        isActive: body.isActive,
        isLocked: body.isLocked,
      }
    });

    return NextResponse.json({ data: service });
  } catch (error) {
    console.error('Failed to update service', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const id = resolvedParams.id;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (existing.isLocked) {
      return NextResponse.json({ error: 'Cannot delete a locked service' }, { status: 403 });
    }

    await prisma.service.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to delete service', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
