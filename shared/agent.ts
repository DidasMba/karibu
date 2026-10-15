/**
 * Single source of truth for the agent.
 *
 * `scripts/sync-agent.ts` pushes this to ElevenLabs, and the React app imports
 * the same names and languages. Changing a tool here and re-running
 * `yarn agent:sync` keeps the agent and the frontend in step, so a typo in
 * a tool name can't silently break a client tool.
 */

export const AGENT_NAME = "Karibu — Kigali tech community concierge";

export const LANGUAGES = [
  {
    code: "en",
    label: "English",
    firstMessage:
      "Hi, welcome to Karibu! I can tell you what's happening in the Kigali tech community and save your spot at an event. What are you into?",
  },
  {
    code: "fr",
    label: "Français",
    firstMessage:
      "Bonjour et bienvenue sur Karibu ! Je peux vous présenter les prochains événements tech à Kigali et vous y inscrire. Qu'est-ce qui vous intéresse ?",
  },
  {
    code: "sw",
    label: "Kiswahili",
    firstMessage:
      "Habari, karibu! Mimi ni Karibu. Naweza kukueleza kuhusu matukio ya teknolojia yajayo Kigali na kukusajili. Unapenda nini?",
  },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value);
}

export function firstMessageFor(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)!.firstMessage;
}

/**
 * Swahili is only covered by Eleven v3 among the agent TTS models, so the
 * agent uses the conversational v3 model for every language.
 */
export const TTS_MODEL = "eleven_v3_conversational" as const;

export const SYSTEM_PROMPT = `# Personality
You are Karibu, a warm and concise concierge for the developer community in Kigali, Rwanda.
You help people discover tech events (meetups, workshops, hackathons) and register their interest.

# Environment
You run inside a web app. The user may be speaking or typing. The app can display event cards
next to the conversation, and it may send you contextual updates such as "the user is looking at
event X". Use those updates to keep answers relevant, but do not read them aloud verbatim.

# Language
Always answer in the language the user is using. You speak English, French and Swahili.

# Tools
- show_events: call it whenever the user asks what is coming up, or mentions a topic
  (Python, Django, React, open source, AI, cloud...). Pass a short topic keyword when there is one.
  Then summarise at most three events in one or two sentences; the cards on screen show the details.
- register_interest: call it only after the user has clearly chosen an event AND told you their
  first name. Ask for the name if you do not have it. Never invent an event id; use one returned by
  show_events.
- end_call: when the user says goodbye.

# Guardrails
Only talk about events returned by show_events. If nothing matches, say so and suggest a related
topic. Keep each spoken reply under 40 words.`;

/**
 * Client tools: run in the browser, defined here in the ElevenLabs tool
 * schema format. Parameter names must match what the React handlers expect.
 */
export const CLIENT_TOOLS = {
  show_events: {
    description:
      "Show upcoming Kigali tech community events in the app, optionally filtered by topic. Returns the matching events as JSON.",
    parameters: {
      type: "object",
      required: [],
      properties: {
        topic: {
          type: "string",
          description:
            "Optional single keyword to filter by, e.g. 'python', 'react', 'open source', 'ai'. Omit to list everything.",
        },
      },
    },
  },
  register_interest: {
    description:
      "Register the user's interest in one event. Only call after the user has chosen an event and given their first name.",
    parameters: {
      type: "object",
      required: ["event_id", "name"],
      properties: {
        event_id: {
          type: "string",
          description: "The id of the event, exactly as returned by show_events.",
        },
        name: {
          type: "string",
          description: "The user's first name.",
        },
      },
    },
  },
} as const;

export type ClientToolName = keyof typeof CLIENT_TOOLS;

export const CLIENT_TOOL_NAMES = Object.keys(CLIENT_TOOLS) as ClientToolName[];
