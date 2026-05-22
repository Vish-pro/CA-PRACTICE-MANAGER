import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');
    const search = searchParams.get('search');
    const clientId = searchParams.get('clientId');

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category && category !== 'All Categories') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (assigneeId) where.assignedToId = assigneeId;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { client: { companyName: { contains: search } } },
        { service: { name: { contains: search } } }
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { companyName: true, clientCode: true } },
        service: { select: { name: true } },
        assignedTo: { select: { name: true, id: true } },
        reviewer: { select: { name: true, id: true } },
      }
    });

    const total = await prisma.task.count({ where });

    return NextResponse.json({ data: tasks, total, page, limit });
  } catch (error) {
    console.error('Failed to fetch tasks', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Generate Task ID transaction
    const task = await prisma.$transaction(async (tx) => {
      // 1. Increment counter
      const counter = await tx.counter.update({
        where: { id: 'task' },
        data: { value: { increment: 1 } }
      });

      // 2. Create Task
      const newTask = await tx.task.create({
        data: {
          taskNumber: counter.value,
          title: body.title,
          description: body.description,
          status: body.status || 'PENDING',
          priority: body.priority || 'MEDIUM',
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          createdById: session.user.id,
          assignedToId: body.assignedToId,
          reviewerId: body.reviewerId,
          clientId: body.clientId,
          serviceId: body.serviceId,
          category: body.category,
          isRecurring: body.isRecurring || false,
          frequency: body.frequency,
          recurringEnd: body.recurringEnd ? new Date(body.recurringEnd) : null,
        }
      });

      // 3. Optional: Copy SOPs if service is linked
      if (body.serviceId) {
        const sops = await tx.serviceSOP.findMany({
          where: { serviceId: body.serviceId }
        });

        if (sops.length > 0) {
          // Simplest way for now: mapping them to subtasks to reuse the schema since Task doesn't have a dedicated SOP field
          // OR if there is a specific field for instance SOPs, we'd populate it.
          // For now, let's map them to subtasks
          await tx.subtask.createMany({
            data: sops.map(sop => ({
              taskId: newTask.id,
              title: sop.title,
              isCompleted: false,
            }))
          });
        }
      }

      return newTask;
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Failed to create task', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
