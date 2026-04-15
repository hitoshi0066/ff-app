import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendConfirmationEmail } from "@/lib/mail";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export const dynamic = "force-dynamic";

// PUT /api/appointments/[id] - Host confirms a time slot
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { timeSlotId } = body;

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: {
      host: true,
      timeSlots: true,
      visitors: true,
      assignees: { include: { user: true } },
    },
  });

  if (!appointment || appointment.hostId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (appointment.status === "CONFIRMED") {
    return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
  }

  const slot = appointment.timeSlots.find((s) => s.id === timeSlotId);
  if (!slot) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  // Mark as confirmed
  await prisma.timeSlot.update({
    where: { id: slot.id },
    data: { status: "CONFIRMED" },
  });

  // Create calendar event + Meet
  const startTime = new Date(slot.date);
  startTime.setMinutes(slot.startMin);
  const endTime = new Date(slot.date);
  endTime.setMinutes(slot.endMin);

  const attendees = [
    appointment.host.email!,
    ...appointment.visitors
      .map((v) => v.email)
      .filter(Boolean) as string[],
  ];

  let meetUrl = "";
  try {
    const calEvent = await createCalendarEvent(appointment.hostId, {
      title: appointment.title || "アポイントメント",
      description: appointment.guidance || undefined,
      startTime,
      endTime,
      attendees,
    });
    meetUrl = calEvent.meetUrl || "";
  } catch (e) {
    console.error("Calendar event creation failed:", e);
  }

  // Update appointment
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "CONFIRMED",
      confirmedSlotId: slot.id,
      meetUrl,
    },
  });

  // Send confirmation emails
  const dateStr = format(slot.date, "yyyy年M月d日（E）", { locale: ja });
  const h1 = Math.floor(slot.startMin / 60);
  const m1 = String(slot.startMin % 60).padStart(2, "0");
  const h2 = Math.floor(slot.endMin / 60);
  const m2 = String(slot.endMin % 60).padStart(2, "0");
  const timeStr = `${h1}:${m1} - ${h2}:${m2}`;

  try {
    await sendConfirmationEmail({
      to: attendees,
      hostName: appointment.host.name || "",
      hostCompany: "株式会社ファーストフレンズ",
      hostEmail: appointment.host.email || "",
      visitors: appointment.visitors.map((v) => ({
        name: v.name,
        company: v.company || "",
        email: v.email || "",
      })),
      date: dateStr,
      time: timeStr,
      meetUrl,
    });
  } catch (e) {
    console.error("Email send failed:", e);
  }

  return NextResponse.json({
    success: true,
    meetUrl,
    date: dateStr,
    time: timeStr,
  });
}

// GET /api/appointments/[id] - Get appointment detail with votes
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: {
      host: true,
      timeSlots: {
        orderBy: [{ date: "asc" }, { startMin: "asc" }],
        include: { votes: { include: { visitor: true } } },
      },
      visitors: { include: { votes: true } },
      assignees: { include: { user: true } },
    },
  });

  if (!appointment || appointment.hostId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(appointment);
}
