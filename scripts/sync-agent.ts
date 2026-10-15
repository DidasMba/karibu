/**
 * Agent as code: creates (or updates) the Karibu agent and its client tools
 * from `shared/agent.ts`. Safe to re-run; it updates in place.
 *
 *   yarn agent:sync
 */
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import {
  AGENT_NAME,
  CLIENT_TOOLS,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  SYSTEM_PROMPT,
  TTS_MODEL,
  firstMessageFor,
  type ClientToolName,
} from "../shared/agent.ts";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY in .env");
  process.exit(1);
}
const client = new ElevenLabsClient({ apiKey });
const ai = client.conversationalAi;

/** Create each client tool, or update it if a tool with that name exists. */
async function syncTool(name: ClientToolName): Promise<string> {
  const def = CLIENT_TOOLS[name];
  const toolConfig = {
    type: "client" as const,
    name,
    description: def.description,
    // Make the agent wait for the browser's answer instead of assuming success.
    expectsResponse: true,
    responseTimeoutSecs: 10,
    parameters: {
      type: "object" as const,
      required: [...def.parameters.required],
      properties: Object.fromEntries(
        Object.entries(def.parameters.properties).map(([key, prop]) => [
          key,
          { type: "string" as const, description: prop.description },
        ]),
      ),
    },
  };

  const { tools } = await ai.tools.list({ search: name, showOnlyOwnedDocuments: true });
  const existing = tools.find((t) => t.toolConfig.type === "client" && t.toolConfig.name === name);
  if (existing) {
    await ai.tools.update(existing.id, { toolConfig });
    console.log(`  ✓ updated tool ${name}`);
    return existing.id;
  }
  const created = await ai.tools.create({ toolConfig });
  console.log(`  ✓ created tool ${name}`);
  return created.id;
}

function writeEnv(key: string, value: string) {
  const path = ".env";
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `${key}=${value}`;
  const next = new RegExp(`^${key}=.*$`, "m").test(current)
    ? current.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${current.trimEnd()}\n${line}\n`;
  writeFileSync(path, next);
}

async function main() {
  console.log("Syncing client tools…");
  const toolIds: string[] = [];
  for (const name of Object.keys(CLIENT_TOOLS) as ClientToolName[]) {
    toolIds.push(await syncTool(name));
  }

  const conversationConfig = {
    agent: {
      firstMessage: firstMessageFor(DEFAULT_LANGUAGE),
      language: DEFAULT_LANGUAGE,
      prompt: {
        prompt: SYSTEM_PROMPT,
        toolIds,
        builtInTools: {
          endCall: { type: "system" as const, name: "end_call", params: { systemToolType: "end_call" as const } },
          // Lets the agent switch language mid-conversation if the user does.
          languageDetection: {
            type: "system" as const,
            name: "language_detection",
            params: { systemToolType: "language_detection" as const },
          },
        },
      },
    },
    tts: { modelId: TTS_MODEL },
    // Translated first messages for the other languages.
    languagePresets: Object.fromEntries(
      LANGUAGES.filter((l) => l.code !== DEFAULT_LANGUAGE).map((l) => [
        l.code,
        { overrides: { agent: { language: l.code, firstMessage: l.firstMessage } } },
      ]),
    ),
  };

  const platformSettings = {
    // The browser may only override these fields, nothing else.
    overrides: {
      conversationConfigOverride: {
        agent: { language: true, firstMessage: true },
        conversation: { textOnly: true },
      },
    },
    // Private agent: sessions need a token or signed URL from our server.
    auth: { enableAuth: true },
  };

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    await ai.agents.update(agentId, { name: AGENT_NAME, conversationConfig, platformSettings });
    console.log(`✓ Updated agent ${agentId}`);
  } else {
    const created = await ai.agents.create({ name: AGENT_NAME, conversationConfig, platformSettings });
    writeEnv("ELEVENLABS_AGENT_ID", created.agentId);
    console.log(`✓ Created agent ${created.agentId} and saved it to .env`);
  }
  console.log("Done. Start the app with `yarn dev`.");
}

main().catch((err) => {
  console.error("Agent sync failed:", err?.body ?? err);
  process.exit(1);
});
