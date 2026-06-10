import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const entry = await prisma.timesheetEntry.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.hours !== undefined ? { hours: parseFloat(body.hours) } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.taskTitle ? { taskTitle: body.taskTitle } : {}),
      },
      include: { user: { select: { id: true, name: true, employeeCode: true } } },
    });
    return NextResponse.json({ data: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update timesheet entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.timesheetEntry.delete({ where: { id } });
    return NextResponse.json({ message: 'Timesheet entry deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete timesheet entry' }, { status: 500 });
  }
}
