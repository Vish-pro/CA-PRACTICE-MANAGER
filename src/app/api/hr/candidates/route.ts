import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const candidates = await prisma.candidate.findMany({
      orderBy: { appliedDate: 'desc' },
    });
    return NextResponse.json({ data: candidates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.email || !body.position || !body.department) {
      return NextResponse.json({ error: 'Name, email, position and department are required' }, { status: 400 });
    }

    const candidate = await prisma.candidate.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        position: body.position,
        department: body.department,
        notes: body.notes || null,
        stage: 'Applied',
      },
    });
    return NextResponse.json({ data: candidate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create candidate' }, { status: 500 });
  }
}
