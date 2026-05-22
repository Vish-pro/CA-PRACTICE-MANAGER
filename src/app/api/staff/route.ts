import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'JUNIOR_STAFF', 'SENIOR_STAFF'] }
      },
      select: { id: true, name: true, role: true }
    });

    return NextResponse.json({ data: staff });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}
