import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEvents, getFreeBusy } from "@/lib/google-calendar";

// POST /api/calendar - Get events for assignees
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { timeMin, timeMax, userIds } = body;

  // Get events for each assignee
  const eventsMap: Record<string, any[]> = {};

  for (const uid of userIds) {
    try {
      const events = await getEvents(
        uid,
        new Date(timeMin),
        new Date(timeMax)
      );
      eventsMap[uid] = events;
    } catch (e) {
      console.error(`Failed to get events for user ${uid}:`, e);
      eventsMap[uid] = [];
    }
  }

  return NextResponse.json({ events: eventsMap });
}
