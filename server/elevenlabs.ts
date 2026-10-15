import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { CredentialProvider } from "./app.ts";

export function elevenLabsProvider(apiKey: string): CredentialProvider {
  const client = new ElevenLabsClient({ apiKey });
  return {
    async conversationToken(agentId) {
      const res = await client.conversationalAi.conversations.getWebrtcToken({ agentId });
      return res.token;
    },
    async signedUrl(agentId) {
      const res = await client.conversationalAi.conversations.getSignedUrl({ agentId });
      return res.signedUrl;
    },
  };
}
