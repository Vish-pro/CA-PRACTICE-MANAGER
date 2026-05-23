import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



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

    const whereAnd: any[] = [];
    if (category && category !== 'All Categories') whereAnd.push({ category });
    if (assigneeId) whereAnd.push({ assignedToId: assigneeId });
    if (clientId) whereAnd.push({ clientId });

    const now = new Date();

    if (status && status !== 'all') {
      if (status === 'OVERDUE') {
        whereAnd.push({
          OR: [
            { status: 'OVERDUE' },
            {
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
              dueDate: { lt: now }
            }
          ]
        });
      } else if (['PENDING', 'IN_PROGRESS', 'SENT_FOR_REVIEW', 'REQUEST_CHANGES'].includes(status)) {
        whereAnd.push({ status: status });
        whereAnd.push({
          OR: [
            { dueDate: { gte: now } },
            { dueDate: null }
          ]
        });
      } else {
        whereAnd.push({ status: status });
      }
    }

    if (search) {
      whereAnd.push({
        OR: [
          { title: { contains: search } },
          { client: { companyName: { contains: search } } },
          { service: { name: { contains: search } } }
        ]
      });
    }

    const where = whereAnd.length > 0 ? { AND: whereAnd } : {};

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

    const mappedTasks = tasks.map((task: any) => {
      let computedStatus = task.status;
      if (
        !['COMPLETED', 'CANCELLED', 'OVERDUE'].includes(task.status) &&
        task.dueDate &&
        new Date(task.dueDate) < now
      ) {
        computedStatus = 'OVERDUE';
      }
      return { ...task, status: computedStatus };
    });

    const total = await prisma.task.count({ where });

    return NextResponse.json({ data: mappedTasks, total, page, limit });
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
      // Fetch service SOP steps if serviceId is provided
      const sops = body.serviceId ? await tx.serviceSOP.findMany({
        where: { serviceId: body.serviceId },
        orderBy: { orderIndex: 'asc' }
      }) : [];

      if (sops.length > 0) {
        let firstCreatedTask: any = null;

        for (let stepIdx = 0; stepIdx < sops.length; stepIdx++) {
          const step = sops[stepIdx];

          // 1. Increment counter for each step
          const counter = await tx.counter.update({
            where: { id: 'task' },
            data: { value: { increment: 1 } }
          });

          // 2. Create separate Task for each step
          const created = await tx.task.create({
            data: {
              taskNumber: counter.value,
              title: `${step.title}: ${step.description ? (step.description.length > 50 ? step.description.substring(0, 50) + '...' : step.description) : 'Perform Service Action'} - ${body.title}`,
              description: step.description || body.description,
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

          if (stepIdx === 0) {
            firstCreatedTask = created;
          }
        }

        return firstCreatedTask;
      } else {
        // Fallback: Create a single monolithic task if no SOP steps exist
        const counter = await tx.counter.update({
          where: { id: 'task' },
          data: { value: { increment: 1 } }
        });

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

        return newTask;
      }
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Failed to create task', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
