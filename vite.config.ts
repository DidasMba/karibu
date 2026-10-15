import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const apiPort = Number(process.env.PORT ?? 8787);

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the browser talks to Vite, and Vite forwards /api to the
    // token server. The ElevenLabs API key never leaves the server process.
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
  build: {
    // The SDK bundles LiveKit for WebRTC audio, which is most of the bundle.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
