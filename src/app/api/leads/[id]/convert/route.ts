import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';



export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();

    const client = await prisma.$transaction(async (tx) => {
      // 1. Get correct client counter prefix based on entity
      let prefix = 'OTH';
      const entity = body.businessEntity || '';
      if (entity.includes('Public Limited')) prefix = 'PLC';
      else if (entity.includes('Private Limited')) prefix = 'PVT';
      else if (entity.includes('Partnership')) prefix = 'PAR';
      else if (entity.includes('LLP')) prefix = 'LLP';
      else if (entity.includes('Proprietorship')) prefix = 'PRO';
      else if (entity.includes('Trust')) prefix = 'TRS';
      else if (entity.includes('HUF')) prefix = 'HUF';

      const counterId = `client_${prefix}`;

      const counter = await tx.counter.upsert({
        where: { id: counterId },
        update: { value: { increment: 1 } },
        create: { id: counterId, value: 1 }
      });

      const clientCode = `${prefix}${String(counter.value).padStart(5, '0')}`;

      // 2. Create User for Client
      // Generate a random password for new client user
      const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

      const clientUser = await tx.user.create({
        data: {
          email: body.contactEmail || `client_${clientCode}@prabandh.in`, // fallback if no email
          passwordHash,
          name: body.contactName || body.businessName,
          role: 'CLIENT',
        }
      });

      // 3. Create ClientProfile
      const newClient = await tx.clientProfile.create({
        data: {
          userId: clientUser.id,
          companyName: body.businessName,
          clientCode: clientCode,
          legalName: body.legalName,
          businessEntity: body.businessEntity,
          contactName: body.contactName,
          contactEmail: body.contactEmail,
          mobile: body.mobile,
          gstNumber: body.gstNumber,
          panNumber: body.panNumber,
          address: body.address,
          auditorId: body.auditorId,
          groupId: body.groupId || null,
        }
      });

      // 4. Update Lead Stage
      await tx.lead.update({
        where: { id: resolvedParams.id },
        data: {
          stage: 'CONVERTED',
          convertedToClientId: newClient.id
        }
      });

      return newClient;
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Failed to convert lead', error);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}
