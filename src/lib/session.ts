import type { SessionResponse } from "../../server/app.ts";

export type Mode = SessionResponse["mode"];

/** Ask our own server for short-lived credentials. The API key stays there. */
export async function fetchSession(mode: Mode): Promise<SessionResponse> {
  const res = await fetch(`/api/session?mode=${mode}`);
  const body = (await res.json().catch(() => ({}))) as Partial<SessionResponse> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Session request failed (${res.status})`);
  return body as SessionResponse;
}

/** Ask for the microphone up front so the failure is explicit, not silent. */
export async function ensureMicrophone(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
}
