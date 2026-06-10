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

    const leaves = await prisma.leave.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(status ? { status } : {}),
      },
      include: { user: { select: { id: true, name: true, employeeCode: true, employmentType: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: leaves });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch leaves' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.userId || !body.startDate || !body.endDate || !body.type || !body.reason) {
      return NextResponse.json({ error: 'userId, startDate, endDate, type and reason are required' }, { status: 400 });
    }

    const leave = await prisma.leave.create({
      data: {
        userId: body.userId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        type: body.type,
        reason: body.reason,
        status: 'PENDING',
      },
      include: { user: { select: { id: true, name: true, employeeCode: true } } },
    });
    return NextResponse.json({ data: leave });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create leave request' }, { status: 500 });
  }
}
