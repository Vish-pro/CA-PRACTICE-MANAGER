import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leaves = await prisma.leave.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true } } },
    });

    const reimbursements = await prisma.reimbursement.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true } } },
    });

    const data = [
      ...leaves.map((l) => ({
        id: l.id,
        type: "Leave",
        title: `${l.type} Leave Application`,
        requester: l.user.name,
        date: `${l.startDate.toISOString().split("T")[0]} to ${l.endDate.toISOString().split("T")[0]}`,
      })),
      ...reimbursements.map((r) => ({
        id: r.id,
        type: "Reimbursement",
        title: r.description,
        requester: r.user.name,
        amount: `₹${r.amount}`,
      })),
    ];

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch approvals", error);
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
