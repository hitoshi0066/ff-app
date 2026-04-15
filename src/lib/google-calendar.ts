import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Get an authenticated Google Calendar client for a user
 */
export async function getCalendarClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("No Google account linked");
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  auth.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Handle token refresh
  auth.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : undefined,
        },
      });
    }
  });

  return google.calendar({ version: "v3", auth });
}

/**
 * Get free/busy info for multiple users
 */
export async function getFreeBusy(
  userId: string,
  calendarIds: string[],
  timeMin: Date,
  timeMax: Date
) {
  const calendar = await getCalendarClient(userId);

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: calendarIds.map((id) => ({ id })),
    },
  });

  return res.data.calendars;
}

/**
 * Get events for a user within a date range
 */
export async function getEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date
) {
  const calendar = await getCalendarClient(userId);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || "(No title)",
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
  }));
}

/**
 * Create a Google Calendar event with Google Meet
 */
export async function createCalendarEvent(
  userId: string,
  params: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
  }
) {
  const calendar = await getCalendarClient(userId);

  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startTime.toISOString() },
      end: { dateTime: params.endTime.toISOString() },
      attendees: params.attendees.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `ff-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    eventId: res.data.id,
    meetUrl: res.data.hangoutLink,
    htmlLink: res.data.htmlLink,
  };
}
