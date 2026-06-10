import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (invoice.status !== 'PROFORMA') return NextResponse.json({ error: 'Only PROFORMA invoices can be converted' }, { status: 400 });

  const year   = new Date().getFullYear();
  const counterId = `invoice_INV_${year}`;
  const updated = await prisma.$transaction(async (tx) => {
    const counter = await tx.counter.upsert({
      where:  { id: counterId },
      update: { value: { increment: 1 } },
      create: { id: counterId, value: 1 },
    });
    const newNumber = `INV-${year}-${String(counter.value).padStart(4, '0')}`;
    return tx.invoice.update({
      where: { id },
      data:  { invoiceNumber: newNumber, status: 'UNPAID' },
    });
  });

  return NextResponse.json({ data: updated });
}
