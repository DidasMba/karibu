import { describe, expect, it } from "vitest";
import { getEvents } from "../shared/events.ts";
import { eventsToolResult, findEvents, registerInterest } from "../shared/tools.ts";
import { CLIENT_TOOLS, LANGUAGES } from "../shared/agent.ts";

const events = getEvents();

describe("findEvents", () => {
  it("returns everything without a topic", () => {
    expect(findEvents(events)).toHaveLength(events.length);
    expect(findEvents(events, "   ")).toHaveLength(events.length);
  });

  it("matches tags, titles and communities case-insensitively", () => {
    expect(findEvents(events, "DJANGO").map((e) => e.id)).toContain("dj-nov");
    expect(findEvents(events, "react rwanda").map((e) => e.id)).toEqual(["react-nov"]);
  });

  it("returns an empty list for unknown topics", () => {
    expect(findEvents(events, "cobol")).toEqual([]);
  });
});

describe("eventsToolResult", () => {
  it("tells the agent explicitly when nothing matched", () => {
    const parsed = JSON.parse(eventsToolResult([], "cobol"));
    expect(parsed.events).toEqual([]);
    expect(parsed.note).toMatch(/No upcoming events/);
  });

  it("only sends the fields the agent needs", () => {
    const parsed = JSON.parse(eventsToolResult(events.slice(0, 1)));
    expect(Object.keys(parsed.events[0]).sort()).toEqual(["community", "date", "id", "title", "venue"]);
  });
});

describe("registerInterest", () => {
  const now = new Date("2026-10-15T08:00:00Z");

  it("registers a valid request", () => {
    const res = registerInterest(events, [], { event_id: "dj-nov", name: " Amani " }, now);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.registration).toEqual({
        eventId: "dj-nov",
        eventTitle: events.find((e) => e.id === "dj-nov")!.title,
        name: "Amani",
        at: now.toISOString(),
      });
    }
  });

  it("asks for a name when missing", () => {
    const res = registerInterest(events, [], { event_id: "dj-nov" });
    expect(res).toMatchObject({ ok: false, toolResult: expect.stringMatching(/first name/) });
  });

  it("rejects invented event ids", () => {
    const res = registerInterest(events, [], { event_id: "made-up", name: "Amani" });
    expect(res).toMatchObject({ ok: false, toolResult: expect.stringMatching(/Unknown event id/) });
  });

  it("rejects non-string parameters from the LLM", () => {
    const res = registerInterest(events, [], { event_id: 42, name: ["x"] });
    expect(res.ok).toBe(false);
  });

  it("does not register the same person twice", () => {
    const first = registerInterest(events, [], { event_id: "dj-nov", name: "Amani" });
    if (!first.ok) throw new Error("expected ok");
    const again = registerInterest(events, [first.registration], { event_id: "dj-nov", name: "amani" });
    expect(again.ok).toBe(false);
  });
});

describe("agent definition", () => {
  it("has a first message for every language", () => {
    for (const l of LANGUAGES) expect(l.firstMessage.length).toBeGreaterThan(10);
  });

  it("declares every required parameter as a property", () => {
    for (const tool of Object.values(CLIENT_TOOLS)) {
      for (const key of tool.parameters.required) {
        expect(tool.parameters.properties).toHaveProperty(key);
      }
    }
  });
});
