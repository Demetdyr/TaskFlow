const MILLISECONDS_PER_MINUTE = 60_000;

export function createFakeClock(initialTimestamp = '2026-10-01T09:00:00.000Z') {
  let currentTimeInMs = new Date(initialTimestamp).getTime();

  const clock = () => new Date(currentTimeInMs);
  clock.advanceByMinutes = (minutes) => {
    currentTimeInMs += minutes * MILLISECONDS_PER_MINUTE;
  };
  clock.setTo = (timestamp) => {
    currentTimeInMs = new Date(timestamp).getTime();
  };

  return clock;
}
