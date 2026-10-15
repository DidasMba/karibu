import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  firstMessageFor,
  type LanguageCode,
} from "../shared/agent.ts";
import { getEvents, type CommunityEvent } from "../shared/events.ts";
import { eventsToolResult, findEvents, registerInterest, type Registration } from "../shared/tools.ts";
import { ensureMicrophone, fetchSession, type Mode } from "./lib/session.ts";
import { Orb } from "./components/Orb.tsx";
import { EventList } from "./components/EventList.tsx";

type LineKind = "user" | "agent" | "tool" | "context";
interface Line {
  id: number;
  kind: LineKind;
  text: string;
}

const EVENTS = getEvents();

export function App() {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [mode, setMode] = useState<Mode>("voice");
  const [lines, setLines] = useState<Line[]>([]);
  const [shown, setShown] = useState<CommunityEvent[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState("");
  const lineId = useRef(0);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const push = useCallback((kind: LineKind, text: string) => {
    setLines((prev) => [...prev, { id: ++lineId.current, kind, text }]);
  }, []);

  const conversation = useConversation({
    onMessage: ({ message, role }) => push(role === "user" ? "user" : "agent", message),
    onError: (message) => setError(message),
  });

  // Stable getter for the orb's animation loop (reads the latest hook value).
  const conversationRef = useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  });
  const getLevel = useCallback(() => {
    const c = conversationRef.current;
    return c.isSpeaking ? c.getOutputVolume() : c.getInputVolume();
  }, []);

  const connected = conversation.status === "connected";
  const busy = starting || conversation.status === "connecting";

  // ---- Client tools: the agent calls these, they run here in the browser ----
  // Parameters come from an LLM, so treat them as untrusted input.

  useConversationClientTool("show_events", (params) => {
    const topic = typeof params.topic === "string" ? params.topic : undefined;
    const matches = findEvents(EVENTS, topic);
    setShown(matches);
    push("tool", `show_events(${topic ? `topic: "${topic}"` : ""}) → ${matches.length} event(s)`);
    return eventsToolResult(matches, topic);
  });

  useConversationClientTool("register_interest", (params) => {
    const result = registerInterest(EVENTS, registrations, params);
    if (result.ok) {
      setRegistrations((prev) => [...prev, result.registration]);
      setFocusedId(result.registration.eventId);
      // Make sure the card is visible even if the agent skipped show_events.
      setShown((prev) =>
        prev.some((e) => e.id === result.registration.eventId)
          ? prev
          : [...prev, ...EVENTS.filter((e) => e.id === result.registration.eventId)],
      );
    }
    push("tool", `register_interest(${JSON.stringify(params)}) → ${result.ok ? "ok" : "rejected"}`);
    return result.toolResult;
  });

  // ---- Session lifecycle ----

  async function start() {
    setError(null);
    setStarting(true);
    setLines([]);
    try {
      if (mode === "voice") await ensureMicrophone();
      const session = await fetchSession(mode);
      const overrides = {
        agent: { language, firstMessage: firstMessageFor(language) },
        conversation: { textOnly: mode === "text" },
      };
      if (session.mode === "voice") {
        conversation.startSession({
          conversationToken: session.conversationToken,
          connectionType: "webrtc",
          overrides,
        });
      } else {
        conversation.startSession({
          signedUrl: session.signedUrl,
          connectionType: "websocket",
          textOnly: true,
          overrides,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser, or switch to text mode."
          : message,
      );
    } finally {
      setStarting(false);
    }
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    conversation.sendUserMessage(text);
    setDraft("");
  }

  // Clicking a card tells the agent what the user is looking at, without
  // forcing a reply. That's what contextual updates are for.
  function focusEvent(event: CommunityEvent) {
    setFocusedId(event.id);
    if (!connected) return;
    conversation.sendContextualUpdate(
      `The user is looking at the event "${event.title}" (id: ${event.id}, ${event.date}).`,
    );
    push("context", `context → user is looking at "${event.title}"`);
  }

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  const statusLabel = busy
    ? "Connecting…"
    : connected
      ? mode === "voice"
        ? conversation.isSpeaking
          ? "Speaking"
          : "Listening"
        : "Connected · text"
      : "Ready";

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Karibu</h1>
            <p>Multilingual community concierge · ElevenAgents + React</p>
          </div>
        </div>

        <div className="controls">
          <fieldset className="segmented" disabled={connected || busy}>
            <legend className="sr-only">Language</legend>
            {LANGUAGES.map((l) => (
              <label key={l.code}>
                <input
                  type="radio"
                  name="language"
                  value={l.code}
                  checked={language === l.code}
                  onChange={() => setLanguage(l.code)}
                />
                <span lang={l.code}>{l.label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="segmented" disabled={connected || busy}>
            <legend className="sr-only">Mode</legend>
            {(["voice", "text"] as const).map((m) => (
              <label key={m}>
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                <span>{m === "voice" ? "Voice" : "Text"}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </header>

      <main className="grid">
        <section className="panel talk" aria-label="Conversation">
          <div className="stage">
            <Orb
              active={connected && mode === "voice"}
              speaking={conversation.isSpeaking}
              getLevel={getLevel}
            />
            <p className="status" data-state={connected ? "on" : busy ? "busy" : "off"}>
              <span className="dot" /> {statusLabel}
            </p>

            <div className="actions">
              {connected ? (
                <>
                  {mode === "voice" && (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => conversation.setMuted(!conversation.isMuted)}
                      aria-pressed={conversation.isMuted}
                    >
                      {conversation.isMuted ? "Unmute" : "Mute"}
                    </button>
                  )}
                  <button type="button" className="btn danger" onClick={() => conversation.endSession()}>
                    End
                  </button>
                </>
              ) : (
                <button type="button" className="btn primary" onClick={start} disabled={busy}>
                  {busy ? "Starting…" : mode === "voice" ? "Start talking" : "Start chatting"}
                </button>
              )}
            </div>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="transcript" aria-live="polite">
            {lines.length === 0 ? (
              <p className="hint">The transcript, tool calls and context updates show up here.</p>
            ) : (
              lines.map((line) => (
                <p key={line.id} className={`line ${line.kind}`}>
                  {line.kind === "tool" || line.kind === "context" ? <code>{line.text}</code> : line.text}
                </p>
              ))
            )}
            <div ref={transcriptEnd} />
          </div>

          <form className="composer" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={connected ? "Type a message…" : "Start a session to type"}
              disabled={!connected}
              aria-label="Message"
            />
            <button type="submit" className="btn" disabled={!connected || !draft.trim()}>
              Send
            </button>
          </form>

          {connected && conversation.canSendFeedback && (
            <div className="feedback">
              <span>Was that answer useful?</span>
              <button type="button" onClick={() => conversation.sendFeedback(true)} aria-label="Yes">
                👍
              </button>
              <button type="button" onClick={() => conversation.sendFeedback(false)} aria-label="No">
                👎
              </button>
            </div>
          )}
        </section>

        <section className="panel side" aria-label="Events">
          <div className="side-head">
            <h2>On screen</h2>
            <span className="tag">client tools</span>
          </div>
          <EventList
            events={shown}
            registrations={registrations}
            focusedId={focusedId}
            onFocus={focusEvent}
          />
          <p className="footnote">Sample events. Replace them in <code>shared/events.ts</code>.</p>
        </section>
      </main>
    </div>
  );
}
