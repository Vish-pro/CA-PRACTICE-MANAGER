import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const direction = searchParams.get('direction');
    const clientId = searchParams.get('clientId');

    const documents = await prisma.document.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(direction ? { direction } : {}),
        ...(clientId ? { clientId } : {}),
        ...(search
          ? {
              OR: [
                { fileName: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                { client: { companyName: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        client: { select: { id: true, companyName: true, legalName: true, clientCode: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: documents.length,
      pendingReview: documents.filter((d) => d.status === 'PENDING_REVIEW').length,
      inward: documents.filter((d) => d.direction === 'INWARD').length,
      outward: documents.filter((d) => d.direction === 'OUTWARD').length,
    };

    return NextResponse.json({ data: documents, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;

    if (!file || !clientId) {
      return NextResponse.json({ error: 'File and client are required' }, { status: 400 });
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedName = `${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);

    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
      select: { id: true },
    });

    const document = await prisma.document.create({
      data: {
        clientId,
        fileName: file.name,
        fileUrl: `/uploads/documents/${storedName}`,
        fileType: file.type || 'application/octet-stream',
        fileSize: buffer.length,
        direction: (formData.get('direction') as string) || 'INWARD',
        status: 'PENDING_REVIEW',
        category: (formData.get('category') as string) || null,
        notes: (formData.get('notes') as string) || null,
        uploadedById: sessionUser?.id || null,
      },
      include: {
        client: { select: { id: true, companyName: true, legalName: true, clientCode: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: document });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 });
  }
}
