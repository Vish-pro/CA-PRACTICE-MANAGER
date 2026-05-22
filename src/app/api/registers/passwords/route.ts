import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const passwords = await prisma.passwordVault.findMany({
      include: {
        client: {
          select: { companyName: true }
        }
      }
    });

    const safePasswords = passwords.map(pwd => ({
      id: pwd.id,
      client: pwd.client.companyName,
      portal: pwd.portalName,
      username: pwd.username,
    }));

    return NextResponse.json(safePasswords);
  } catch (error) {
    console.error('Error fetching passwords:', error);
    return NextResponse.json({ error: 'Failed to fetch passwords' }, { status: 500 });
  }
}
