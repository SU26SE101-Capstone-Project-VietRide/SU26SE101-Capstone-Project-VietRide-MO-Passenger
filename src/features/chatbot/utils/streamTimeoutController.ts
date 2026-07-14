import {
  STREAM_HARD_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
} from '../constants/chatLimits';

export type StreamTimeoutReason = 'idle' | 'hard';

interface StreamTimeoutControllerOptions {
  idleTimeoutMs?: number;
  hardTimeoutMs?: number;
  onTimeout: (reason: StreamTimeoutReason) => void;
}

/**
 * Keeps a resettable idle deadline and a non-resettable hard deadline.
 * Heartbeats may extend the idle window, but can never keep a stream alive
 * forever.
 */
export class StreamTimeoutController {
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private hardTimer: ReturnType<typeof setTimeout> | undefined;
  private active = false;

  private readonly idleTimeoutMs: number;
  private readonly hardTimeoutMs: number;
  private readonly onTimeout: (reason: StreamTimeoutReason) => void;

  constructor({
    idleTimeoutMs = STREAM_IDLE_TIMEOUT_MS,
    hardTimeoutMs = STREAM_HARD_TIMEOUT_MS,
    onTimeout,
  }: StreamTimeoutControllerOptions) {
    this.idleTimeoutMs = idleTimeoutMs;
    this.hardTimeoutMs = hardTimeoutMs;
    this.onTimeout = onTimeout;
  }

  start(): void {
    this.stop();
    this.active = true;
    this.hardTimer = setTimeout(
      () => this.expire('hard'),
      this.hardTimeoutMs,
    );
    this.scheduleIdleTimeout();
  }

  markActivity(): void {
    if (!this.active) return;
    this.scheduleIdleTimeout();
  }

  stop(): void {
    this.active = false;
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    if (this.hardTimer !== undefined) clearTimeout(this.hardTimer);
    this.idleTimer = undefined;
    this.hardTimer = undefined;
  }

  private scheduleIdleTimeout(): void {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(
      () => this.expire('idle'),
      this.idleTimeoutMs,
    );
  }

  private expire(reason: StreamTimeoutReason): void {
    if (!this.active) return;
    this.stop();
    this.onTimeout(reason);
  }
}
