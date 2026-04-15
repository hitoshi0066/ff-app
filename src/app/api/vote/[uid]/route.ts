import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVoteCompleteNotification } from "@/lib/mail";

export const dynamic = "force-dynamic";

// POST /api/vote/[uid] - Visitor submits votes
export async function POST(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const { uid } = params;
  const body = await req.json();
  const { answers, company, email } = body;
  // answers: { [timeSlotId]: "OK" | "MAYBE" | "NG" }

  const visitor = await prisma.visitor.findUnique({
    where: { uid },
    include: {
      appointment: {
        include: {
          host: true,
          visitors: true,
          timeSlots: true,
        },
      },
    },
  });

  if (!visitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appointment = visitor.appointment;

  // Update visitor info
  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { company, email, hasResponded: true },
  });

  // Upsert votes
  const votePromises = Object.entries(answers).map(
    ([timeSlotId, answer]) =>
      prisma.vote.upsert({
        where: {
          visitorId_timeSlotId: {
            visitorId: visitor.id,
            timeSlotId,
          },
        },
        create: {
          visitorId: visitor.id,
          timeSlotId,
          answer: answer as any,
        },
        update: {
          answer: answer as any,
        },
      })
  );
  await Promise.all(votePromises);

  // Check if all visitors (grouped by company) have responded
  // Get unique group keys
  const allVisitors = appointment.visitors;
  const groupKeys = Array.from(
    new Set(
      allVisitors
        .map((v) => v.groupKey)
        .filter((gk): gk is string => gk !== null)
    )
  );

  // For each group, check if at least one visitor has responded
  const allGroupsResponded = groupKeys.every((gk) =>
    allVisitors.filter((v) => v.groupKey === gk).some((v) => v.hasResponded)
  );

  if (allGroupsResponded) {
    // Notify host
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    try {
      await sendVoteCompleteNotification({
        to: appointment.host.email!,
        hostName: appointment.host.name || "",
        confirmUrl: `${appUrl}/host-confirm/${appointment.id}`,
        appointmentTitle: appointment.title || "アポイントメント",
      });
    } catch (e) {
      console.error("Vote complete notification failed:", e);
    }
  }

  return NextResponse.json({
    success: true,
    allResponded: allGroupsResponded,
  });
}

// GET /api/vote/[uid] - Get appointment data for voting page
export async function GET(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const visitor = await prisma.visitor.findUnique({
    where: { uid: params.uid },
    include: {
      appointment: {
        include: {
          host: true,
          timeSlots: { orderBy: [{ date: "asc" }, { startMin: "asc" }] },
          visitors: {
            include: { votes: true },
          },
        },
      },
      votes: true,
    },
  });

  if (!visitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    visitor,
    appointment: visitor.appointment,
  });
}
