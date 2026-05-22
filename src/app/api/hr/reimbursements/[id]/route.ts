import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    const body = await request.json();

    const reimbursement = await prisma.reimbursement.update({
      where: { id: resolvedParams.id },
      data: { status: body.status },
    });

    return NextResponse.json({ data: reimbursement });
  } catch (error) {
    console.error("Failed to update reimbursement status", error);
    return NextResponse.json(
      { error: "Failed to update reimbursement status" },
      { status: 500 }
    );
  }
}
