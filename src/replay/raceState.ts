/**
 * Derives "what is happening right now" from the packed telemetry: running
 * order, lap counts, tyre compounds, and the gap to the cars ahead and behind.
 *
 * Time gaps come from OpenF1's `/intervals`. Distance gaps do not exist in the
 * API at all — they are computed here by projecting both cars onto the track
 * centreline and taking the arc length between them, which is what makes the
 * reference HUD's "+3.04s (168.7m)" readout possible.
 */

import { newCursor, samplePath, sampleCarData, seek } from './packing';
import type { Cursor, CarSample } from './packing';
import { projectToTrack, trackGap } from './trackGeometry';
import type { TrackGeometry } from './trackGeometry';
import type { ReplaySession, WeatherSample } from './types';

export interface DriverState {
  driverNumber: number;
  position: number;
  lap: number;
  retired: boolean;
  /** Interpolated track position, or null when the car is not on track. */
  x: number | null;
  y: number | null;
  /** Arc length along the centreline; null until the track is built. */
  s: number | null;
  /** Seconds to the car ahead. null when lapped or leading. */
  intervalAhead: number | null;
  gapToLeader: number | null;
  compound: string | null;
}

export interface NeighbourGap {
  acronym: string;
  seconds: number | null;
  metres: number | null;
}

export interface RaceState {
  timeMs: number;
  leaderLap: number;
  totalLaps: number;
  order: DriverState[];
  byDriver: Map<number, DriverState>;
  weather: WeatherSample | null;
}

/**
 * Holds the read cursors between frames. One instance per mounted replay; the
 * cursors are what keep per-frame lookups to a few comparisons instead of a
 * binary search across every series.
 */
export class RaceStateSampler {
  private pathCursors = new Map<number, Cursor>();
  private carCursors = new Map<number, Cursor>();
  private posCursors = new Map<number, Cursor>();
  private intervalCursors = new Map<number, Cursor>();
  private weatherCursor = newCursor();
  private lapStarts = new Map<number, Uint32Array>();
  private weatherTimes: Uint32Array;

  constructor(private replay: ReplaySession) {
    this.rebuildLapIndex();
    this.weatherTimes = Uint32Array.from(
      replay.weather.map((w) => Math.max(0, Math.round(w.t)))
    );
  }

  /** Call after more laps arrive; cheap enough to run on every data update. */
  rebuildLapIndex(): void {
    const byDriver = new Map<number, number[]>();
    for (const lap of this.replay.laps) {
      if (lap.t == null || lap.t < 0) continue;
      let arr = byDriver.get(lap.driverNumber);
      if (!arr) {
        arr = [];
        byDriver.set(lap.driverNumber, arr);
      }
      arr.push(lap.t);
    }
    this.lapStarts.clear();
    for (const [num, times] of byDriver) {
      times.sort((a, b) => a - b);
      this.lapStarts.set(num, Uint32Array.from(times));
    }
  }

  private cursor(map: Map<number, Cursor>, key: number): Cursor {
    let c = map.get(key);
    if (!c) {
      c = newCursor();
      map.set(key, c);
    }
    return c;
  }

  /** Lap the driver is on at `timeMs` (1-based, 0 before the first lap). */
  lapFor(driverNumber: number, timeMs: number): number {
    const starts = this.lapStarts.get(driverNumber);
    if (!starts || starts.length === 0) return 0;
    let lo = 0;
    let hi = starts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= timeMs) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private compoundFor(driverNumber: number, lap: number): string | null {
    for (const stint of this.replay.stints) {
      if (stint.driverNumber !== driverNumber) continue;
      if (lap >= stint.lapStart && lap <= stint.lapEnd) return stint.compound;
    }
    return null;
  }

  telemetryFor(driverNumber: number, timeMs: number): CarSample | null {
    const car = this.replay.carData.get(driverNumber);
    if (!car) return null;
    return sampleCarData(car, timeMs, this.cursor(this.carCursors, driverNumber));
  }

  weatherAt(timeMs: number): WeatherSample | null {
    const n = this.weatherTimes.length;
    if (n === 0) return null;
    const i = seek(this.weatherTimes, n, timeMs, this.weatherCursor);
    return this.replay.weather[Math.max(0, i)] ?? null;
  }

  sample(timeMs: number, track: TrackGeometry | null): RaceState {
    const states: DriverState[] = [];

    for (const driverNumber of this.replay.driverOrder) {
      const path = this.replay.paths.get(driverNumber);
      const retiredAt = this.replay.retirements.get(driverNumber);
      const retired = retiredAt !== undefined && timeMs > retiredAt;

      let x: number | null = null;
      let y: number | null = null;
      if (path && !retired) {
        const p = samplePath(path, timeMs, this.cursor(this.pathCursors, driverNumber));
        if (p) {
          x = p.x;
          y = p.y;
        }
      }

      const posTrack = this.replay.positions.get(driverNumber);
      let position = 99;
      if (posTrack && posTrack.n > 0) {
        const i = seek(posTrack.t, posTrack.n, timeMs, this.cursor(this.posCursors, driverNumber));
        position = posTrack.position[Math.max(0, i)] || 99;
      }

      const intervalTrack = this.replay.intervals.get(driverNumber);
      let intervalAhead: number | null = null;
      let gapToLeader: number | null = null;
      if (intervalTrack && intervalTrack.n > 0) {
        const i = seek(
          intervalTrack.t,
          intervalTrack.n,
          timeMs,
          this.cursor(this.intervalCursors, driverNumber)
        );
        if (i >= 0) {
          const iv = intervalTrack.interval[i];
          const gl = intervalTrack.gapToLeader[i];
          intervalAhead = Number.isNaN(iv) ? null : iv;
          gapToLeader = Number.isNaN(gl) ? null : gl;
        }
      }

      const lap = this.lapFor(driverNumber, timeMs);

      states.push({
        driverNumber,
        position,
        lap,
        retired,
        x,
        y,
        s: track && x != null && y != null ? projectToTrack(track, x, y) : null,
        intervalAhead,
        gapToLeader,
        compound: this.compoundFor(driverNumber, Math.max(1, lap)),
      });
    }

    states.sort((a, b) => {
      if (a.retired !== b.retired) return a.retired ? 1 : -1;
      return a.position - b.position;
    });

    const byDriver = new Map<number, DriverState>();
    for (const s of states) byDriver.set(s.driverNumber, s);

    const leaderLap = states.length > 0 ? states[0].lap : 0;

    return {
      timeMs,
      leaderLap,
      totalLaps: this.replay.totalLaps,
      order: states,
      byDriver,
      weather: this.weatherAt(timeMs),
    };
  }
}

/**
 * Gap from `driverNumber` to the car directly ahead of it in the running order.
 * The time component comes straight from `/intervals`; the distance is measured
 * along the centreline, so it stays honest through corners.
 */
export function gapAhead(
  state: RaceState,
  track: TrackGeometry | null,
  driverNumber: number,
  acronymOf: (n: number) => string
): NeighbourGap | null {
  const idx = state.order.findIndex((d) => d.driverNumber === driverNumber);
  if (idx <= 0) return null;
  const me = state.order[idx];
  const ahead = state.order[idx - 1];

  return {
    acronym: acronymOf(ahead.driverNumber),
    seconds: me.intervalAhead,
    metres: distanceBetween(track, ahead, me),
  };
}

/** Same as {@link gapAhead}, for the car directly behind. */
export function gapBehind(
  state: RaceState,
  track: TrackGeometry | null,
  driverNumber: number,
  acronymOf: (n: number) => string
): NeighbourGap | null {
  const idx = state.order.findIndex((d) => d.driverNumber === driverNumber);
  if (idx < 0 || idx >= state.order.length - 1) return null;
  const me = state.order[idx];
  const behind = state.order[idx + 1];
  if (behind.retired) return null;

  return {
    acronym: acronymOf(behind.driverNumber),
    // `interval` on the car behind is its gap to us.
    seconds: behind.intervalAhead,
    metres: distanceBetween(track, me, behind),
  };
}

function distanceBetween(
  track: TrackGeometry | null,
  ahead: DriverState,
  behind: DriverState
): number | null {
  if (!track || ahead.s == null || behind.s == null) return null;
  const tenths = trackGap(track, ahead.s, behind.s);
  // Beyond half a lap the pair is almost certainly split by a lap, not a gap.
  if (tenths > track.length / 2) return null;
  return tenths / 10;
}

/**
 * Picks a representative flying lap to trace the circuit from: a mid-race lap,
 * not out of the pits, with a duration near the driver's median. Returns the
 * driver and the time window, or null when the session has no usable lap.
 */
export function pickTrackLap(
  replay: ReplaySession
): { driverNumber: number; startMs: number; endMs: number } | null {
  let best: { driverNumber: number; startMs: number; endMs: number; score: number } | null = null;

  for (const driverNumber of replay.driverOrder) {
    const path = replay.paths.get(driverNumber);
    if (!path || path.n < 1000) continue;

    const laps = replay.laps
      .filter(
        (l) =>
          l.driverNumber === driverNumber &&
          l.t != null &&
          l.t >= 0 &&
          !l.isPitOutLap &&
          l.durationSec != null &&
          l.durationSec > 30 &&
          l.durationSec < 400
      )
      .sort((a, b) => (a.durationSec ?? 0) - (b.durationSec ?? 0));

    if (laps.length === 0) continue;

    // The quickest laps are the cleanest trace of the racing line, but the very
    // fastest can be a lap where the car ran wide, so take a little off the top.
    const chosen = laps[Math.min(laps.length - 1, Math.floor(laps.length * 0.1))];
    const score = chosen.durationSec ?? Infinity;
    if (!best || score < best.score) {
      best = {
        driverNumber,
        startMs: chosen.t as number,
        endMs: (chosen.t as number) + (chosen.durationSec as number) * 1000,
        score,
      };
    }
  }

  if (!best) return null;
  return { driverNumber: best.driverNumber, startMs: best.startMs, endMs: best.endMs };
}
