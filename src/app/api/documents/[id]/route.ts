import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.direction ? { direction: body.direction } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.clientId ? { clientId: body.clientId } : {}),
      },
      include: {
        client: { select: { id: true, companyName: true, legalName: true, clientCode: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: document });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update document' }, { status: 500 });
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
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Remove the stored file from disk (best-effort)
    if (document.fileUrl?.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', document.fileUrl);
      try { fs.unlinkSync(filePath); } catch {}
    }

    await prisma.documentMovement.deleteMany({ where: { documentId: id } });
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ message: 'Document deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete document' }, { status: 500 });
  }
}
