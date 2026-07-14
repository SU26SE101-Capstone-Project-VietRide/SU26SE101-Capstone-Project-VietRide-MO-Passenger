import { StreamTimeoutController } from './streamTimeoutController';

describe('StreamTimeoutController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('extends the idle deadline when stream activity is received', () => {
    const onTimeout = jest.fn();
    const controller = new StreamTimeoutController({
      idleTimeoutMs: 45_000,
      hardTimeoutMs: 120_000,
      onTimeout,
    });

    controller.start();
    jest.advanceTimersByTime(40_000);
    controller.markActivity();
    jest.advanceTimersByTime(44_999);

    expect(onTimeout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledWith('idle');
  });

  it('does not let repeated activity extend the hard deadline', () => {
    const onTimeout = jest.fn();
    const controller = new StreamTimeoutController({
      idleTimeoutMs: 45_000,
      hardTimeoutMs: 120_000,
      onTimeout,
    });

    controller.start();
    jest.advanceTimersByTime(40_000);
    controller.markActivity();
    jest.advanceTimersByTime(40_000);
    controller.markActivity();
    jest.advanceTimersByTime(40_000);

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('hard');
  });

  it('clears both deadlines when stopped', () => {
    const onTimeout = jest.fn();
    const controller = new StreamTimeoutController({
      idleTimeoutMs: 45_000,
      hardTimeoutMs: 120_000,
      onTimeout,
    });

    controller.start();
    controller.stop();
    jest.runOnlyPendingTimers();

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
