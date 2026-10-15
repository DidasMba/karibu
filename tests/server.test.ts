import { describe, expect, it, vi } from "vitest";
import { createApp, type CredentialProvider } from "../server/app.ts";

function fakeProvider(overrides: Partial<CredentialProvider> = {}): CredentialProvider {
  return {
    conversationToken: vi.fn(async () => "token-123"),
    signedUrl: vi.fn(async () => "wss://example.test/signed"),
    ...overrides,
  };
}

describe("GET /api/session", () => {
  it("returns a WebRTC token for voice by default", async () => {
    const provider = fakeProvider();
    const app = createApp({ provider, agentId: "agent_1" });
    const res = await app.request("/api/session");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ mode: "voice", conversationToken: "token-123" });
    expect(provider.conversationToken).toHaveBeenCalledWith("agent_1");
  });

  it("returns a signed URL for text mode", async () => {
    const app = createApp({ provider: fakeProvider(), agentId: "agent_1" });
    const res = await app.request("/api/session?mode=text");
    expect(await res.json()).toEqual({ mode: "text", signedUrl: "wss://example.test/signed" });
  });

  it("rejects unknown modes", async () => {
    const app = createApp({ provider: fakeProvider(), agentId: "agent_1" });
    expect((await app.request("/api/session?mode=video")).status).toBe(400);
  });

  it("explains how to fix a missing agent id", async () => {
    const app = createApp({ provider: fakeProvider(), agentId: undefined });
    const res = await app.request("/api/session");
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/agent:sync/);
  });

  it("hides upstream error details from the browser", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = fakeProvider({
      conversationToken: async () => {
        throw new Error("401 invalid api key sk_live_secret");
      },
    });
    const app = createApp({ provider, agentId: "agent_1" });
    const res = await app.request("/api/session");
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("sk_live_secret");
  });

  it("rate-limits per client and resets after the window", async () => {
    let t = 0;
    const app = createApp({
      provider: fakeProvider(),
      agentId: "agent_1",
      rateLimit: { max: 2, windowMs: 1000 },
      now: () => t,
    });
    const hit = (ip: string) => app.request("/api/session", { headers: { "x-forwarded-for": ip } });

    expect((await hit("1.1.1.1")).status).toBe(200);
    expect((await hit("1.1.1.1")).status).toBe(200);
    const limited = await hit("1.1.1.1");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("1");
    expect((await hit("2.2.2.2")).status).toBe(200);

    t = 1000;
    expect((await hit("1.1.1.1")).status).toBe(200);
  });
});
