import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

const WRITE_ROLES = ['ADMIN', 'SENIOR_STAFF'];
const READ_ROLES  = ['ADMIN', 'SENIOR_STAFF', 'STAFF', 'JUNIOR_STAFF'];

async function generateInvoiceNumber(tx: any, isProforma: boolean) {
  const prefix = isProforma ? 'PRO' : 'INV';
  const year   = new Date().getFullYear();
  const counterId = `invoice_${prefix}_${year}`;
  const counter = await tx.counter.upsert({
    where:  { id: counterId },
    update: { value: { increment: 1 } },
    create: { id: counterId, value: 1 },
  });
  return `${prefix}-${year}-${String(counter.value).padStart(4, '0')}`;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const status   = searchParams.get('status');
  const search   = searchParams.get('search');
  const page     = parseInt(searchParams.get('page') || '1');
  const limit    = parseInt(searchParams.get('limit') || '50');

  const where: any = {};
  if (clientId) where.clientId = clientId;
  if (status && status !== 'all') where.status = status;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { client: { companyName: { contains: search } } },
      { client: { legalName:   { contains: search } } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { issueDate: 'desc' },
      include: {
        client:        { select: { id: true, companyName: true, legalName: true, clientCode: true } },
        lineItems:     { include: { service: { select: { name: true } } } },
        payments:      true,
        billingEntity: { select: { id: true, name: true } },
        createdBy:     { select: { id: true, name: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  // Compute overdue flag and paid amount
  const now = new Date();
  const mapped = invoices.map(inv => {
    const paidAmount = inv.payments.reduce((s, p) => s + p.amount, 0);
    let status = inv.status;
    if (status === 'UNPAID' && inv.dueDate && new Date(inv.dueDate) < now) status = 'OVERDUE';
    return { ...inv, paidAmount, status };
  });

  // Stats
  const [totalUnpaid, totalPaid, totalProforma, overdueCount] = await Promise.all([
    prisma.invoice.aggregate({ where: { status: 'UNPAID' }, _sum: { totalAmount: true }, _count: true }),
    prisma.invoice.aggregate({ where: { status: 'PAID'   }, _sum: { totalAmount: true }, _count: true }),
    prisma.invoice.count({ where: { status: 'PROFORMA' } }),
    prisma.invoice.count({ where: { status: 'UNPAID', dueDate: { lt: now } } }),
  ]);

  return NextResponse.json({
    data: mapped,
    total,
    stats: {
      unpaidAmount: totalUnpaid._sum.totalAmount || 0,
      unpaidCount:  totalUnpaid._count,
      paidAmount:   totalPaid._sum.totalAmount || 0,
      paidCount:    totalPaid._count,
      proformaCount: totalProforma,
      overdueCount,
    },
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!WRITE_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const isProforma = body.isProforma ?? true;

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(tx, isProforma);

    const lineItems = (body.lineItems || []) as Array<{
      description: string; serviceId?: string; hsnCode?: string;
      quantity: number; unitPrice: number; taxRate: number;
    }>;

    const taxableAmount = lineItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0);
    const taxAmount     = lineItems.reduce((s, li) => s + (li.unitPrice * li.quantity) * (li.taxRate / 100), 0);
    const discount      = body.discount || 0;
    const totalAmount   = taxableAmount + taxAmount - discount;

    return tx.invoice.create({
      data: {
        invoiceNumber,
        clientId:       body.clientId,
        billingEntityId:body.billingEntityId || null,
        createdById:    (session.user as any).id || null,
        status:         isProforma ? 'PROFORMA' : 'UNPAID',
        issueDate:      body.issueDate ? new Date(body.issueDate) : new Date(),
        dueDate:        body.dueDate   ? new Date(body.dueDate)   : null,
        taxableAmount,
        taxAmount,
        discount,
        totalAmount,
        notes:          body.notes || null,
        lineItems: {
          create: lineItems.map(li => ({
            description: li.description,
            serviceId:   li.serviceId   || null,
            hsnCode:     li.hsnCode     || null,
            quantity:    li.quantity    || 1,
            unitPrice:   li.unitPrice,
            taxRate:     li.taxRate     ?? 18,
            totalPrice:  li.unitPrice * (li.quantity || 1),
          })),
        },
      },
      include: {
        client:    { select: { companyName: true, legalName: true } },
        lineItems: true,
        payments:  true,
      },
    });
  });

  return NextResponse.json({ data: invoice }, { status: 201 });
}
