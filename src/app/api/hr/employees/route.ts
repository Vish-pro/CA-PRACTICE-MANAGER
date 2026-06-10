import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const leaveDays = (start: Date, end: Date) =>
  Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employees = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SENIOR_STAFF', 'JUNIOR_STAFF'] } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        jobTitle: true,
        department: true,
        employeeCode: true,
        employmentType: true,
        dateOfJoining: true,
        hodPartner: true,
        icaiRegNo: true,
        totalLeavesAllowed: true,
        isActive: true,
        reportingToId: true,
        reportingTo: { select: { id: true, name: true, employeeCode: true } },
        leaves: { where: { status: 'APPROVED' }, select: { startDate: true, endDate: true } },
      },
      orderBy: [{ employmentType: 'asc' }, { name: 'asc' }],
    });

    const data = employees.map((e) => ({
      ...e,
      leavesTaken: e.leaves.reduce((sum, l) => sum + leaveDays(l.startDate, l.endDate), 0),
      leaves: undefined,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.email || !body.employeeCode) {
      return NextResponse.json({ error: 'Name, email and employee code are required' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { employeeCode: body.employeeCode }] },
    });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email or employee code already exists' }, { status: 409 });
    }

    const type = body.employmentType || 'Paid Assistant';
    const roleByType: Record<string, string> = {
      Partner: 'ADMIN',
      Manager: 'SENIOR_STAFF',
      'Qualified CA': 'SENIOR_STAFF',
      'Paid Assistant': 'JUNIOR_STAFF',
      'Article Assistant': 'JUNIOR_STAFF',
    };

    const passwordHash = await bcrypt.hash(body.password || 'welcome123', 10);
    const employee = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        passwordHash,
        role: roleByType[type] || 'JUNIOR_STAFF',
        jobTitle: type,
        department: body.department || null,
        employeeCode: body.employeeCode,
        employmentType: type,
        dateOfJoining: body.dateOfJoining ? new Date(body.dateOfJoining) : new Date(),
        reportingToId: body.reportingToId || null,
        hodPartner: body.hodPartner || null,
        icaiRegNo: type === 'Article Assistant' ? body.icaiRegNo || null : null,
        totalLeavesAllowed: type === 'Article Assistant' ? 24 : 30,
        isActive: true,
      },
    });

    // If onboarding from a candidate, advance the pipeline to Hired
    if (body.candidateId) {
      await prisma.candidate.update({
        where: { id: body.candidateId },
        data: { stage: 'Hired' },
      }).catch(() => null);
    }

    return NextResponse.json({ data: employee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to onboard employee' }, { status: 500 });
  }
}
