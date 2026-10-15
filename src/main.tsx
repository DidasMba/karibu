import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConversationProvider } from "@elevenlabs/react";
import { App } from "./App.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Every conversation hook below reads from this provider. */}
    <ConversationProvider>
      <App />
    </ConversationProvider>
  </StrictMode>,
);
