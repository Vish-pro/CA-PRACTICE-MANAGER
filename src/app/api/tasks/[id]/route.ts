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

    const requiresInvoice = task.description?.includes('[requires_invoice_generation=true]') || task.status === 'Billing_Pending';

    return NextResponse.json({ 
      data: {
        ...task,
        requires_invoice_generation: requiresInvoice
      } 
    });
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
      select: { status: true, assignedToId: true, createdById: true, description: true },
    });
    const statusChanged = body.status !== undefined && existing?.status !== body.status;

    let assignedToId = body.assignedToId;
    if (body.status === 'Review_Rejected') {
      assignedToId = existing?.assignedToId || existing?.createdById || session.user.id;
    }

    let description = body.description !== undefined ? body.description : existing?.description;
    if (body.status === 'Billing_Pending') {
      const tag = "\n[requires_invoice_generation=true]";
      if (description && !description.includes(tag)) {
        description = (description || "") + tag;
      } else if (!description) {
        description = tag;
      }
    }

    const task = await prisma.task.update({
      where: { id: resolvedParams.id },
      data: {
        title: body.title,
        description: description,
        status: body.status,
        priority: body.priority,
        dueDate: dueDate,
        assignedToId: assignedToId,
        reviewerId: body.reviewerId,
        completedAt: body.status === 'COMPLETED' ? new Date() : null,
        statusChangedAt: statusChanged ? new Date() : undefined,
      }
    });

    const requiresInvoice = task.description?.includes('[requires_invoice_generation=true]') || task.status === 'Billing_Pending';

    return NextResponse.json({ 
      data: {
        ...task,
        requires_invoice_generation: requiresInvoice
      }
    });
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
