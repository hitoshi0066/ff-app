import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

// POST /api/appointments - Create appointment
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    guidance,
    issueCode,
    issueMeet,
    timeSlots,
    assigneeIds,
    visitors,
  } = body;

  // Determine if multi-company (3+ parties)
  const uniqueCompanies = new Set(
    visitors.map((v: any) => (v.company || "").trim()).filter(Boolean)
  );
  const isMultiCompany = uniqueCompanies.size >= 2;

  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      hostId: session.user.id,
      title,
      guidance,
      issueCode: issueCode ?? true,
      issueMeet: issueMeet ?? true,
      status: "PENDING",
      timeSlots: {
        create: timeSlots.map((s: any) => ({
          date: new Date(s.date),
          startMin: s.startMin,
          endMin: s.endMin,
        })),
      },
      assignees: {
        create: assigneeIds.map((uid: string, i: number) => ({
          userId: uid,
          colorIndex: i,
        })),
      },
      visitors: {
        create: visitors.map((v: any) => ({
          name: v.name,
          company: v.company,
          email: v.email,
          uid: nanoid(12),
          groupKey: isMultiCompany ? (v.company || "").trim() : null,
        })),
      },
    },
    include: {
      timeSlots: true,
      visitors: true,
      assignees: { include: { user: true } },
    },
  });

  // Generate booking/vote URLs
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const urls = isMultiCompany
    ? // Group visitors by company, one URL per company
      Object.entries(
        appointment.visitors.reduce((acc: any, v) => {
          const key = v.groupKey || v.id;
          if (!acc[key]) acc[key] = { company: v.company, visitors: [], uid: v.uid };
          acc[key].visitors.push(v);
          return acc;
        }, {})
      ).map(([_, group]: [string, any]) => ({
        company: group.company,
        visitors: group.visitors,
        url: `${appUrl}/vote/${group.uid}`,
      }))
    : // Single URL for 2-party
      [{ url: `${appUrl}/book/${appointment.visitors[0]?.uid}` }];

  return NextResponse.json({
    appointment,
    urls,
    type: isMultiCompany ? "vote" : "direct",
  });
}

// GET /api/appointments - List appointments
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointments = await prisma.appointment.findMany({
    where: { hostId: session.user.id },
    include: {
      timeSlots: true,
      visitors: true,
      assignees: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(appointments);
}
