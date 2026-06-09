import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const groups = await prisma.clientGroup.findMany({
      include: {
        _count: {
          select: { clients: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ data: groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Group Name is required' }, { status: 400 });
    }

    const group = await prisma.clientGroup.create({
      data: {
        name: body.name,
        description: body.description || null
      }
    });

    return NextResponse.json({ data: group });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create group' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const updated = await prisma.clientGroup.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null
      }
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // First unlink clients belonging to this group
    await prisma.clientProfile.updateMany({
      where: { groupId: id },
      data: { groupId: null }
    });

    // Then delete the group itself
    await prisma.clientGroup.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete group' }, { status: 500 });
  }
}
