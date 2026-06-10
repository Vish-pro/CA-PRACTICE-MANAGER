import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

const STAGES = ['Applied', 'Interviewing', 'Offer', 'Onboarding', 'Hired', 'Rejected'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (body.stage && !STAGES.includes(body.stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        ...(body.stage ? { stage: body.stage } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    return NextResponse.json({ data: candidate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update candidate' }, { status: 500 });
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
    await prisma.candidate.delete({ where: { id } });
    return NextResponse.json({ message: 'Candidate deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete candidate' }, { status: 500 });
  }
}
