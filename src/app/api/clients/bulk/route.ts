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
    if (data.auditorId !== undefined) updateData.auditorId = data.auditorId;
    if (data.groupId !== undefined) updateData.groupId = data.groupId;
    
    // For labels, we can either append or replace. Let's support replacing or appending depending on the data.
    // If it's a simple string, let's update it.
    if (data.labels !== undefined) updateData.labels = data.labels;

    const updated = await prisma.clientProfile.updateMany({
      where: {
        id: { in: ids }
      },
      data: updateData
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error('Failed to perform bulk update on clients', error);
    return NextResponse.json({ error: 'Failed to perform bulk update' }, { status: 500 });
  }
}
