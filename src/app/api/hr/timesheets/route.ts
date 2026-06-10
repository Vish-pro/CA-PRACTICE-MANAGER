import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const timesheets = await prisma.timesheetEntry.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(status ? { status } : {}),
      },
      include: { user: { select: { id: true, name: true, employeeCode: true, employmentType: true } } },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ data: timesheets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch timesheets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.userId || !body.taskTitle || body.hours === undefined) {
      return NextResponse.json({ error: 'userId, taskTitle and hours are required' }, { status: 400 });
    }

    const entry = await prisma.timesheetEntry.create({
      data: {
        userId: body.userId,
        taskTitle: body.taskTitle,
        clientName: body.clientName || null,
        hours: parseFloat(body.hours),
        description: body.description || null,
        status: body.status || 'DRAFT',
        isManual: body.isManual !== false,
        date: body.date ? new Date(body.date) : new Date(),
      },
      include: { user: { select: { id: true, name: true, employeeCode: true } } },
    });
    return NextResponse.json({ data: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create timesheet entry' }, { status: 500 });
  }
}

// Bulk submit: moves all DRAFT entries of a user to PENDING
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (body.action !== 'submit-drafts' || !body.userId) {
      return NextResponse.json({ error: 'Expected action submit-drafts with userId' }, { status: 400 });
    }

    const result = await prisma.timesheetEntry.updateMany({
      where: { userId: body.userId, status: 'DRAFT' },
      data: { status: 'PENDING' },
    });
    return NextResponse.json({ data: { submitted: result.count } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit drafts' }, { status: 500 });
  }
}
