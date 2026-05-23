import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dscs = await prisma.dSCRegister.findMany({
      include: {
        client: {
          select: {
            companyName: true,
          }
        }
      },
      orderBy: {
        expiryDate: 'asc'
      }
    });

    // Format the response and calculate status
    const formattedDscs = dscs.map((dsc) => {
      const now = new Date();
      const expiry = new Date(dsc.expiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status = 'ACTIVE';
      if (diffDays <= 0) {
        status = 'EXPIRED';
      } else if (diffDays <= 30) {
        status = 'EXPIRING_SOON';
      }

      return {
        id: dsc.id,
        client: dsc.client.companyName,
        holder: dsc.holderName,
        expiry: expiry.toISOString().split('T')[0],
        location: dsc.location || 'Unknown',
        status: status
      };
    });

    return NextResponse.json(formattedDscs);
  } catch (error) {
    console.error('Error fetching DSC register:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DSC register' },
      { status: 500 }
    );
  }
}
