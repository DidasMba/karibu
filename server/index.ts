import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { elevenLabsProvider } from "./elevenlabs.ts";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

const agentId = process.env.ELEVENLABS_AGENT_ID || undefined;
const port = Number(process.env.PORT ?? 8787);

const app = createApp({ provider: elevenLabsProvider(apiKey), agentId });

// In production the same process serves the built React app.
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

serve({ fetch: app.fetch, port }, ({ port }) => {
  console.log(`[karibu] token server on http://localhost:${port}`);
  if (!agentId) console.warn("[karibu] ELEVENLABS_AGENT_ID is empty. Run `yarn agent:sync`.");
});
