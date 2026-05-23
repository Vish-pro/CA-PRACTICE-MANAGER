import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const rateCards = await prisma.clientRateCard.findMany({
      where: { clientId: resolvedParams.id },
      include: {
        service: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: rateCards });
  } catch (error) {
    console.error('Failed to fetch client services', error);
    return NextResponse.json({ error: 'Failed to fetch client services' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const body = await request.json();
    const { serviceId, customPrice } = body;

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    // Check if the rate card already exists
    const existing = await prisma.clientRateCard.findFirst({
      where: { clientId: resolvedParams.id, serviceId }
    });

    if (existing) {
      return NextResponse.json({ error: 'Service already assigned to this client' }, { status: 400 });
    }

    // Fetch client profile to retrieve auditorId and companyName
    const client = await prisma.clientProfile.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch service profile along with its SOP steps
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { sopSteps: { orderBy: { orderIndex: 'asc' } } }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const rateCard = await prisma.clientRateCard.create({
      data: {
        clientId: resolvedParams.id,
        serviceId,
        customPrice: Number(customPrice) || 0,
      },
      include: {
        service: true
      }
    });

    // Automatically create a separate Task for each SOP step of this service
    if (service.sopSteps.length > 0) {
      for (let stepIdx = 0; stepIdx < service.sopSteps.length; stepIdx++) {
        const step = service.sopSteps[stepIdx];

        // Increment the global task counter
        const counter = await prisma.counter.update({
          where: { id: 'task' },
          data: { value: { increment: 1 } }
        });

        // Create the task record
        await prisma.task.create({
          data: {
            taskNumber: counter.value,
            title: `${step.title}: ${step.description ? (step.description.length > 50 ? step.description.substring(0, 50) + '...' : step.description) : 'Perform Service Action'} - ${service.name} (${client.companyName})`,
            description: step.description || `Step ${stepIdx + 1} of ${service.name} filing.`,
            status: 'PENDING',
            priority: 'MEDIUM',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // due in 15 days
            clientId: client.id,
            serviceId: service.id,
            category: service.category,
            assignedToId: client.auditorId, // Assigned directly to the client's auditor (employee)
            createdById: (session as any).user.id || client.auditorId,
          }
        });
      }
    } else {
      // Fallback: Create a single task if the service has no SOP steps
      const counter = await prisma.counter.update({
        where: { id: 'task' },
        data: { value: { increment: 1 } }
      });

      await prisma.task.create({
        data: {
          taskNumber: counter.value,
          title: `File ${service.name} for ${client.companyName}`,
          description: `Please file the ${service.name} before the due date.`,
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          clientId: client.id,
          serviceId: service.id,
          category: service.category,
          assignedToId: client.auditorId,
          createdById: (session as any).user.id || client.auditorId,
        }
      });
    }

    return NextResponse.json({ data: rateCard });
  } catch (error) {
    console.error('Failed to assign client service', error);
    return NextResponse.json({ error: 'Failed to assign client service' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const resolvedParams = await params;

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    await prisma.clientRateCard.deleteMany({
      where: {
        clientId: resolvedParams.id,
        serviceId,
      }
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to remove client service', error);
    return NextResponse.json({ error: 'Failed to remove client service' }, { status: 500 });
  }
}
