/**
 * The simulation clock.
 *
 * The race time lives in a ref, not in React state. At 8x a frame advances the
 * clock by ~130 ms of race time, and pushing that through `setState` sixty
 * times a second would re-render the whole panel on every tick. Instead the
 * canvas subscribes to a per-frame callback and reads the ref directly, while
 * React only sees a value throttled to ~10 Hz for the text readouts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

export const SPEED_STEPS = [0.5, 1, 2, 4, 8, 16] as const;

/** How often the throttled value handed to React is refreshed. */
const UI_TICK_MS = 100;

export interface RaceClock {
  /** Race time in ms since the session epoch. Read this inside a draw loop. */
  timeRef: MutableRefObject<number>;
  /** Throttled copy of `timeRef` for text that React renders. */
  displayTime: number;
  isPlaying: boolean;
  speed: number;
  durationMs: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  seek: (ms: number) => void;
  skip: (deltaMs: number) => void;
  setSpeed: (speed: number) => void;
  stepSpeed: (direction: 1 | -1) => void;
  /** Registers a per-frame callback. Returns an unsubscribe function. */
  subscribe: (fn: (timeMs: number) => void) => () => void;
}

export function useRaceReplay(durationMs: number, enabled: boolean): RaceClock {
  const timeRef = useRef(0);
  const speedRef = useRef(1);
  const playingRef = useRef(false);
  const lastFrameRef = useRef(0);
  const lastUiPushRef = useRef(0);
  const subscribersRef = useRef(new Set<(t: number) => void>());
  const durationRef = useRef(durationMs);

  const [displayTime, setDisplayTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);

  durationRef.current = durationMs;

  const notify = useCallback((t: number) => {
    for (const fn of subscribersRef.current) fn(t);
  }, []);

  const subscribe = useCallback((fn: (t: number) => void) => {
    subscribersRef.current.add(fn);
    fn(timeRef.current);
    return () => {
      subscribersRef.current.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      const prev = lastFrameRef.current || now;
      lastFrameRef.current = now;

      if (playingRef.current) {
        // Clamp the delta so a backgrounded tab does not jump the race forward
        // by however long the user was away.
        const deltaMs = Math.min(now - prev, 250) * speedRef.current;
        const next = timeRef.current + deltaMs;

        if (next >= durationRef.current) {
          timeRef.current = durationRef.current;
          playingRef.current = false;
          setIsPlaying(false);
        } else {
          timeRef.current = next;
        }
      }

      notify(timeRef.current);

      if (now - lastUiPushRef.current >= UI_TICK_MS) {
        lastUiPushRef.current = now;
        setDisplayTime(timeRef.current);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      lastFrameRef.current = 0;
    };
  }, [enabled, notify]);

  const play = useCallback(() => {
    if (timeRef.current >= durationRef.current) timeRef.current = 0;
    playingRef.current = true;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [play, pause]);

  const seek = useCallback((ms: number) => {
    const clamped = Math.max(0, Math.min(durationRef.current, ms));
    timeRef.current = clamped;
    setDisplayTime(clamped);
    for (const fn of subscribersRef.current) fn(clamped);
  }, []);

  const skip = useCallback(
    (deltaMs: number) => {
      seek(timeRef.current + deltaMs);
    },
    [seek]
  );

  const restart = useCallback(() => {
    seek(0);
  }, [seek]);

  const setSpeed = useCallback((next: number) => {
    speedRef.current = next;
    setSpeedState(next);
  }, []);

  const stepSpeed = useCallback((direction: 1 | -1) => {
    const idx = SPEED_STEPS.indexOf(speedRef.current as (typeof SPEED_STEPS)[number]);
    const base = idx === -1 ? SPEED_STEPS.indexOf(1) : idx;
    const next = SPEED_STEPS[Math.max(0, Math.min(SPEED_STEPS.length - 1, base + direction))];
    speedRef.current = next;
    setSpeedState(next);
  }, []);

  return useMemo(
    () => ({
      timeRef,
      displayTime,
      isPlaying,
      speed,
      durationMs,
      play,
      pause,
      toggle,
      restart,
      seek,
      skip,
      setSpeed,
      stepSpeed,
      subscribe,
    }),
    [
      displayTime,
      isPlaying,
      speed,
      durationMs,
      play,
      pause,
      toggle,
      restart,
      seek,
      skip,
      setSpeed,
      stepSpeed,
      subscribe,
    ]
  );
}

/** Formats race time as H:MM:SS, matching the reference HUD. */
export function formatRaceTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
