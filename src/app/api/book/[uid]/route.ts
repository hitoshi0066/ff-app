import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendConfirmationEmail } from "@/lib/mail";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// POST /api/book/[uid] - Visitor confirms a time slot
export async function POST(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const { uid } = params;
  const body = await req.json();
  const { timeSlotId, company, email } = body;

  // Find visitor by uid
  const visitor = await prisma.visitor.findUnique({
    where: { uid },
    include: {
      appointment: {
        include: {
          host: true,
          timeSlots: true,
          visitors: true,
          assignees: { include: { user: true } },
        },
      },
    },
  });

  if (!visitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appointment = visitor.appointment;
  if (appointment.status === "CONFIRMED") {
    return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
  }

  // Find the selected time slot
  const slot = appointment.timeSlots.find((s) => s.id === timeSlotId);
  if (!slot) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  // Update visitor info
  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { company, email, hasResponded: true },
  });

  // Mark slot as confirmed, appointment as confirmed
  await prisma.timeSlot.update({
    where: { id: slot.id },
    data: { status: "CONFIRMED" },
  });

  // Create Google Calendar event + Meet
  const startTime = new Date(slot.date);
  startTime.setMinutes(slot.startMin);
  const endTime = new Date(slot.date);
  endTime.setMinutes(slot.endMin);

  const attendees = [
    appointment.host.email!,
    ...appointment.visitors.map((v) => v.email).filter(Boolean) as string[],
    email,
  ].filter(Boolean);

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
  const timeStr = `${Math.floor(slot.startMin / 60)}:${String(slot.startMin % 60).padStart(2, "0")} - ${Math.floor(slot.endMin / 60)}:${String(slot.endMin % 60).padStart(2, "0")}`;

  try {
    await sendConfirmationEmail({
      to: attendees,
      hostName: appointment.host.name || "",
      hostCompany: "株式会社ファーストフレンズ",
      hostEmail: appointment.host.email || "",
      visitors: appointment.visitors.map((v) => ({
        name: v.name,
        company: v.company || company || "",
        email: v.email || email || "",
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
