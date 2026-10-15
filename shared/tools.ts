/**
 * Pure logic behind the client tools. Kept free of React and of the SDK so it
 * can be unit-tested, and so the tool contract (what the agent receives back)
 * is easy to read in one place.
 */
import type { CommunityEvent } from "./events.ts";

export interface Registration {
  eventId: string;
  eventTitle: string;
  name: string;
  at: string;
}

/** Case-insensitive match on tags, title, community and summary. */
export function findEvents(events: CommunityEvent[], topic?: string): CommunityEvent[] {
  const q = topic?.trim().toLowerCase();
  if (!q) return events;
  return events.filter((e) =>
    [e.title, e.community, e.summary, ...e.tags].some((field) => field.toLowerCase().includes(q)),
  );
}

/**
 * What the agent receives from show_events. Short, structured and explicit
 * about the empty case, so the LLM doesn't invent events.
 */
export function eventsToolResult(matches: CommunityEvent[], topic?: string): string {
  if (matches.length === 0) {
    return JSON.stringify({
      events: [],
      note: `No upcoming events match "${topic ?? ""}". Tell the user and suggest another topic.`,
    });
  }
  return JSON.stringify({
    events: matches.map(({ id, title, community, date, venue }) => ({ id, title, community, date, venue })),
    note: "These events are now displayed as cards in the app.",
  });
}

export type RegisterResult =
  | { ok: true; registration: Registration; toolResult: string }
  | { ok: false; toolResult: string };

export function registerInterest(
  events: CommunityEvent[],
  existing: Registration[],
  params: { event_id?: unknown; name?: unknown },
  now: Date = new Date(),
): RegisterResult {
  const eventId = typeof params.event_id === "string" ? params.event_id.trim() : "";
  const name = typeof params.name === "string" ? params.name.trim() : "";

  if (!name) {
    return { ok: false, toolResult: "Missing the user's first name. Ask for it, then call again." };
  }
  const event = events.find((e) => e.id === eventId);
  if (!event) {
    return {
      ok: false,
      toolResult: `Unknown event id "${eventId}". Call show_events and use one of the returned ids.`,
    };
  }
  const duplicate = existing.some(
    (r) => r.eventId === event.id && r.name.toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) {
    return { ok: false, toolResult: `${name} is already registered for "${event.title}".` };
  }

  const registration: Registration = {
    eventId: event.id,
    eventTitle: event.title,
    name,
    at: now.toISOString(),
  };
  return {
    ok: true,
    registration,
    toolResult: `Registered ${name} for "${event.title}" on ${event.date}. Confirm briefly.`,
  };
}
