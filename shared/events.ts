/**
 * SAMPLE DATA. These events are placeholders that show the shape the tools
 * expect. Replace them with your own source (a JSON file, a CMS, the Luma
 * API...) by editing `getEvents()`.
 */

export interface CommunityEvent {
  id: string;
  title: string;
  community: string;
  date: string; // ISO date, YYYY-MM-DD
  venue: string;
  tags: string[];
  summary: string;
}

const SAMPLE_EVENTS: CommunityEvent[] = [
  {
    id: "dj-nov",
    title: "Django in production: deploys, queues and caching",
    community: "Django Rwanda",
    date: "2026-11-07",
    venue: "Kigali (venue TBC)",
    tags: ["python", "django", "backend"],
    summary: "Talks and a hands-on session on shipping Django apps that stay fast under load.",
  },
  {
    id: "react-nov",
    title: "React Server Components workshop",
    community: "React Rwanda",
    date: "2026-11-14",
    venue: "Kigali (venue TBC)",
    tags: ["react", "javascript", "typescript", "frontend"],
    summary: "Bring a laptop: we build a small app with server components and streaming.",
  },
  {
    id: "oss-first-pr",
    title: "Your first open source pull request",
    community: "Open Source Kigali",
    date: "2026-11-21",
    venue: "Online",
    tags: ["open source", "git", "beginners"],
    summary: "Pair with maintainers to find a good first issue and open a real PR.",
  },
  {
    id: "voice-ai",
    title: "Building voice agents with ElevenLabs",
    community: "Open Source Kigali",
    date: "2026-11-28",
    venue: "Online",
    tags: ["ai", "voice", "javascript", "open source"],
    summary: "Live coding a multilingual voice agent with React, from API key to deploy.",
  },
  {
    id: "cloud-ai",
    title: "Cloud AI study jam",
    community: "Kigali developer community",
    date: "2026-12-05",
    venue: "Kigali (venue TBC)",
    tags: ["ai", "cloud", "python"],
    summary: "Work through hands-on labs on deploying and evaluating LLM apps in the cloud.",
  },
];

export function getEvents(): CommunityEvent[] {
  return SAMPLE_EVENTS;
}
