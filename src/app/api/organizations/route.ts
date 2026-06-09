import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgs = await prisma.billingEntity.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ data: orgs });
  } catch (error) {
    console.error('Failed to fetch billing entities', error);
    return NextResponse.json({ error: 'Failed to fetch billing entities' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, gstin, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const org = await prisma.billingEntity.create({
      data: {
        name,
        gstin: gstin || null,
        address: address || null
      }
    });

    return NextResponse.json({ data: org });
  } catch (error) {
    console.error('Failed to create billing entity', error);
    return NextResponse.json({ error: 'Failed to create billing entity' }, { status: 500 });
  }
}
