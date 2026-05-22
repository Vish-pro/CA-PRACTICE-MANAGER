import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';



export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const client = await prisma.clientProfile.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: true,
        auditor: { select: { id: true, name: true } },
        tasks: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { service: true, assignedTo: true }
        },
        invoices: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        dscs: true,
        licenses: true,
        passwords: true,
      }
    });

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Failed to fetch client details', error);
    return NextResponse.json({ error: 'Failed to fetch client details' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();

    const client = await prisma.clientProfile.update({
      where: { id: resolvedParams.id },
      data: {
        companyName: body.companyName,
        legalName: body.legalName,
        businessEntity: body.businessEntity,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        mobile: body.mobile,
        gstNumber: body.gstNumber,
        panNumber: body.panNumber,
        address: body.address,
        auditorId: body.auditorId,
        groupId: body.groupId,
        labels: body.labels,
      }
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Failed to update client', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    // Assuming we do soft delete or real delete. For safety, typically soft delete or complex cascades.
    await prisma.clientProfile.delete({ where: { id: resolvedParams.id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to delete client', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
