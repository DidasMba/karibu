import type { CommunityEvent } from "../../shared/events.ts";
import type { Registration } from "../../shared/tools.ts";

interface EventListProps {
  events: CommunityEvent[];
  registrations: Registration[];
  focusedId: string | null;
  onFocus: (event: CommunityEvent) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function EventList({ events, registrations, focusedId, onFocus }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="empty">
        <p>Events the agent finds will appear here.</p>
        <p className="hint">Try: “What's on for React developers?” or “Kuna nini kuhusu Python?”</p>
      </div>
    );
  }

  return (
    <ul className="events">
      {events.map((e) => {
        const registered = registrations.filter((r) => r.eventId === e.id);
        return (
          <li key={e.id}>
            <button
              type="button"
              className="event"
              data-focused={focusedId === e.id}
              onClick={() => onFocus(e)}
            >
              <span className="event-meta">
                <time dateTime={e.date}>{dateFormat.format(new Date(`${e.date}T12:00:00`))}</time>
                <span>{e.community}</span>
              </span>
              <span className="event-title">{e.title}</span>
              <span className="event-summary">{e.summary}</span>
              <span className="event-foot">
                <span>{e.venue}</span>
                {registered.length > 0 && (
                  <span className="badge">✓ {registered.map((r) => r.name).join(", ")}</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
