/**
 * Client-side safety limits for the RAG stream.
 *
 * The backend remains responsible for its own token/output limits. These
 * bounds protect the mobile JS runtime from malformed or unexpectedly large
 * streams before content is retained in React state.
 */
export const MAX_SSE_PENDING_LINE_BYTES = 64 * 1024;
export const MAX_SSE_EVENT_BYTES = 64 * 1024;
export const MAX_SSE_STREAM_BYTES = 2 * 1024 * 1024;
export const MAX_ASSISTANT_CHARACTERS = 32_000;
export const MAX_CITED_CHUNKS = 32;

export const STREAM_IDLE_TIMEOUT_MS = 45_000;
export const STREAM_HARD_TIMEOUT_MS = 120_000;
