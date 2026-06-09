import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { ids, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs list' }, { status: 400 });
    }

    const updateData: any = {};
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.stage !== undefined) updateData.stage = data.stage;

    const updated = await prisma.lead.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error('Failed to perform bulk update on leads', error);
    return NextResponse.json({ error: 'Failed to perform bulk update' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs list' }, { status: 400 });
    }

    const deleted = await prisma.lead.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    console.error('Failed to perform bulk delete on leads', error);
    return NextResponse.json({ error: 'Failed to perform bulk delete' }, { status: 500 });
  }
}
