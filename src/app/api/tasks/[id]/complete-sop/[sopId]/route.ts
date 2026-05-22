import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



export async function POST(request: Request, { params }: { params: Promise<{ id: string, sopId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { isCompleted } = body;
    const resolvedParams = await params;

    // As discussed in the Tasks creation endpoint, SOPs are mapped to Subtasks.
    // So `sopId` here corresponds to the `Subtask.id`
    const subtask = await prisma.subtask.update({
      where: { id: resolvedParams.sopId, taskId: resolvedParams.id },
      data: { isCompleted }
    });

    return NextResponse.json({ data: subtask });
  } catch (error) {
    console.error('Failed to update SOP completion', error);
    return NextResponse.json({ error: 'Failed to update SOP completion' }, { status: 500 });
  }
}
