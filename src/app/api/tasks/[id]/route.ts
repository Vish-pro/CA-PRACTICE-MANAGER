import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const task = await prisma.task.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: true,
        service: true,
        assignedTo: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        subtasks: true,
      }
    });

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Failed to fetch task', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();

    let dueDate = body.dueDate ? new Date(body.dueDate) : undefined;

    // If manually marking as OVERDUE and no explicit due date provided,
    // set due date to yesterday
    if (body.status === 'OVERDUE' && !body.dueDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 0);
      dueDate = yesterday;
    }

    // Detect status change to track statusChangedAt accurately
    const existing = await prisma.task.findUnique({
      where: { id: resolvedParams.id },
      select: { status: true },
    });
    const statusChanged = body.status !== undefined && existing?.status !== body.status;

    const task = await prisma.task.update({
      where: { id: resolvedParams.id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueDate: dueDate,
        assignedToId: body.assignedToId,
        reviewerId: body.reviewerId,
        completedAt: body.status === 'COMPLETED' ? new Date() : null,
        statusChangedAt: statusChanged ? new Date() : undefined,
      }
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Failed to update task', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    await prisma.task.delete({ where: { id: resolvedParams.id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to delete task', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
