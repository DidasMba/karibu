import { Hono } from "hono";

/**
 * Anything that can mint short-lived credentials for a conversation.
 * The real implementation calls ElevenLabs; tests pass a fake.
 */
export interface CredentialProvider {
  /** WebRTC token, used for voice conversations. */
  conversationToken(agentId: string): Promise<string>;
  /** Signed WebSocket URL, used for text-only conversations. */
  signedUrl(agentId: string): Promise<string>;
}

export type SessionResponse =
  | { mode: "voice"; conversationToken: string }
  | { mode: "text"; signedUrl: string };

export interface AppOptions {
  provider: CredentialProvider;
  agentId: string | undefined;
  /** Max session requests per client per window. */
  rateLimit?: { max: number; windowMs: number };
  /** Injectable clock, for tests. */
  now?: () => number;
}

export function createApp({
  provider,
  agentId,
  rateLimit = { max: 10, windowMs: 60_000 },
  now = Date.now,
}: AppOptions) {
  const app = new Hono();
  const hits = new Map<string, { count: number; resetAt: number }>();

  app.get("/api/health", (c) => c.json({ ok: true, agentConfigured: Boolean(agentId) }));

  app.get("/api/session", async (c) => {
    if (!agentId) {
      return c.json(
        { error: "ELEVENLABS_AGENT_ID is not set. Run `yarn agent:sync` first." },
        503,
      );
    }

    const mode = c.req.query("mode") ?? "voice";
    if (mode !== "voice" && mode !== "text") {
      return c.json({ error: 'mode must be "voice" or "text"' }, 400);
    }

    // Tiny fixed-window limiter so a public demo can't be used to drain your
    // ElevenLabs credits. Swap for your platform's limiter in production.
    const client =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "local";
    const t = now();
    const entry = hits.get(client);
    if (!entry || entry.resetAt <= t) {
      hits.set(client, { count: 1, resetAt: t + rateLimit.windowMs });
    } else if (entry.count >= rateLimit.max) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - t) / 1000)));
      return c.json({ error: "Too many sessions, try again in a minute." }, 429);
    } else {
      entry.count += 1;
    }

    try {
      const body: SessionResponse =
        mode === "voice"
          ? { mode, conversationToken: await provider.conversationToken(agentId) }
          : { mode, signedUrl: await provider.signedUrl(agentId) };
      c.header("Cache-Control", "no-store");
      return c.json(body);
    } catch (err) {
      // Log the real reason server-side; never echo upstream errors (which
      // can include request details) back to the browser.
      console.error("[karibu] failed to create session credentials:", err);
      return c.json({ error: "Could not start a session with ElevenLabs." }, 502);
    }
  });

  return app;
}
