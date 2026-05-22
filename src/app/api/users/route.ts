import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await prisma.user.findMany({
      where: {
        role: {
          not: 'CLIENT'
        }
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error('Failed to fetch users', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
