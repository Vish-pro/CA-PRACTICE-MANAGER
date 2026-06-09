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
    const { name, gstin, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updated = await prisma.billingEntity.update({
      where: { id: resolvedParams.id },
      data: {
        name,
        gstin: gstin || null,
        address: address || null
      }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Failed to update billing entity', error);
    return NextResponse.json({ error: 'Failed to update billing entity' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    await prisma.billingEntity.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete billing entity', error);
    return NextResponse.json({ error: 'Failed to delete billing entity' }, { status: 500 });
  }
}
