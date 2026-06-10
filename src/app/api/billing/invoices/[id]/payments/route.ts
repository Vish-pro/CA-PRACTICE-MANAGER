import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        invoiceId:   id,
        amount:      body.amount,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        method:      body.method || 'BANK_TRANSFER',
        reference:   body.reference || null,
      },
    });

    // Recompute status
    const invoice  = await tx.invoice.findUnique({ where: { id }, include: { payments: true } });
    const paid     = invoice!.payments.reduce((s, p) => s + p.amount, 0);
    let newStatus  = 'PARTIAL';
    if (paid >= invoice!.totalAmount) newStatus = 'PAID';

    await tx.invoice.update({ where: { id }, data: { status: newStatus } });
    return p;
  });

  return NextResponse.json({ data: payment }, { status: 201 });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const payments = await prisma.payment.findMany({
    where:   { invoiceId: id },
    orderBy: { paymentDate: 'desc' },
  });

  return NextResponse.json({ data: payments });
}
